import csv
import io

from flask import Blueprint, Response, g, request
from sqlalchemy import func, or_

from app.errors import ApiError
from app.extensions import db
from app.models import APPLICATION_STATUSES, JOB_STATUSES, Application, AuditLog, CandidateProfile, Job, \
    RecruiterProfile, User
from app.services.audit_service import record_audit
from app.services.notification_service import notify
from app.utils.auth import roles_required
from app.utils.helpers import clean_str, get_json, ok, paged_response

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _get_user(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        raise ApiError("User not found.", 404)
    return user


@bp.get("/stats")
@roles_required("admin")
def stats():
    by_status = dict(
        db.session.query(Application.status, func.count(Application.id)).group_by(Application.status).all()
    )
    return ok({
        "candidates": User.query.filter_by(role="candidate").count(),
        "recruiters": User.query.filter_by(role="recruiter").count(),
        "pending_recruiters": User.query.filter_by(role="recruiter", is_verified=False).count(),
        "suspended_users": User.query.filter(User.is_active.is_(False), User.role != "admin").count(),
        "jobs_total": Job.query.count(),
        "jobs_open": Job.query.filter_by(status="open").count(),
        "jobs_closed": Job.query.filter_by(status="closed").count(),
        "jobs_removed": Job.query.filter_by(status="removed").count(),
        "applications_total": Application.query.count(),
        "applications_by_status": {s: int(by_status.get(s, 0)) for s in APPLICATION_STATUSES},
    })


@bp.get("/users")
@roles_required("admin")
def list_users():
    query = User.query.filter(User.role != "admin")
    role = request.args.get("role")
    if role:
        if role not in ("candidate", "recruiter"):
            raise ApiError("Invalid role filter.", 400)
        query = query.filter(User.role == role)
    state = request.args.get("state")
    if state == "suspended":
        query = query.filter(User.is_active.is_(False))
    elif state == "pending":
        query = query.filter(User.role == "recruiter", User.is_verified.is_(False))
    q = request.args.get("q", "").strip()[:100]
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.full_name.ilike(like), User.email.ilike(like)))
    query = query.order_by(User.created_at.desc(), User.id.desc())
    return paged_response(query, lambda u: u.to_dict())


@bp.patch("/users/<int:user_id>")
@roles_required("admin")
def update_user(user_id):
    user = _get_user(user_id)
    if user.role == "admin":
        raise ApiError("Administrator accounts cannot be modified here.", 403)
    data = get_json()
    changes = []
    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            raise ApiError("is_active must be true or false.", 400, {"field": "is_active"})
        user.is_active = data["is_active"]
        changes.append(f"is_active={user.is_active}")
    if "is_verified" in data:
        if user.role != "recruiter":
            raise ApiError("Only recruiter accounts are verified.", 400, {"field": "is_verified"})
        if not isinstance(data["is_verified"], bool):
            raise ApiError("is_verified must be true or false.", 400, {"field": "is_verified"})
        user.is_verified = data["is_verified"]
        changes.append(f"is_verified={user.is_verified}")
    if not changes:
        raise ApiError("No changes supplied.", 400)
    record_audit(g.current_user.id, "user.update", "user", user.id, ", ".join(changes))
    if "is_verified" in data and user.is_verified:
        notify(user.id, "Account verified", "Your recruiter account is verified. You can now post jobs.", "/recruiter")
    db.session.commit()
    return ok(user.to_dict())


@bp.get("/jobs")
@roles_required("admin")
def list_jobs():
    query = Job.query.join(RecruiterProfile, Job.recruiter_id == RecruiterProfile.id)
    status = request.args.get("status")
    if status:
        if status not in JOB_STATUSES:
            raise ApiError("Invalid status filter.", 400)
        query = query.filter(Job.status == status)
    q = request.args.get("q", "").strip()[:100]
    if q:
        query = query.filter(or_(Job.title.ilike(f"%{q}%"), RecruiterProfile.company_name.ilike(f"%{q}%")))
    query = query.order_by(Job.created_at.desc(), Job.id.desc())
    return paged_response(query, lambda j: j.to_dict(include_applicants=True))


@bp.patch("/jobs/<int:job_id>/remove")
@roles_required("admin")
def remove_job(job_id):
    job = db.session.get(Job, job_id)
    if job is None:
        raise ApiError("Job not found.", 404)
    data = get_json()
    reason = clean_str(data, "reason", 5, 500)
    job.status = "removed"
    job.removal_reason = reason
    record_audit(g.current_user.id, "job.remove", "job", job.id, reason)
    notify(job.recruiter.user_id, "Job removed",
           f"Your job posting '{job.title}' was removed by an administrator.", "/recruiter/jobs")
    db.session.commit()
    return ok(job.to_dict())


@bp.patch("/jobs/<int:job_id>/restore")
@roles_required("admin")
def restore_job(job_id):
    job = db.session.get(Job, job_id)
    if job is None:
        raise ApiError("Job not found.", 404)
    if job.status != "removed":
        raise ApiError("Only removed jobs can be restored.", 409)
    job.status = "closed"
    job.removal_reason = None
    record_audit(g.current_user.id, "job.restore", "job", job.id)
    db.session.commit()
    return ok(job.to_dict())


@bp.get("/activity")
@roles_required("admin")
def activity():
    query = AuditLog.query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    return paged_response(query, lambda log: log.to_dict())


@bp.get("/reports/applications")
@roles_required("admin")
def applications_report():
    """JSON summary by status and employment type, or CSV export with ?format=csv.
    The CSV contains no candidate contact details (data minimisation)."""
    rows = (
        db.session.query(Application, Job, RecruiterProfile)
        .join(Job, Application.job_id == Job.id)
        .join(RecruiterProfile, Job.recruiter_id == RecruiterProfile.id)
        .order_by(Application.applied_at.desc())
        .all()
    )
    if request.args.get("format") == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["application_id", "job_id", "job_title", "company", "employment_type", "status",
                         "match_score", "applied_at"])
        for application, job, recruiter in rows:
            writer.writerow([application.id, job.id, job.title, recruiter.company_name, job.employment_type,
                             application.status, application.match_score, application.applied_at.isoformat()])
        return Response(buffer.getvalue(), mimetype="text/csv",
                        headers={"Content-Disposition": "attachment; filename=applications.csv"})

    by_type = {}
    for _, job, _ in rows:
        by_type[job.employment_type] = by_type.get(job.employment_type, 0) + 1
    by_status = {}
    for application, _, _ in rows:
        by_status[application.status] = by_status.get(application.status, 0) + 1
    return ok({"total": len(rows), "by_status": by_status, "by_employment_type": by_type})
