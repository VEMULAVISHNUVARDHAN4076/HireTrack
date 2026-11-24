from flask import Blueprint, g, request
from sqlalchemy.exc import IntegrityError

from app.errors import ApiError
from app.extensions import db
from app.models import APPLICATION_STATUSES, Application, ApplicationStatusHistory, CandidateProfile, Interview, Job, \
    Resume, User
from app.services.access import get_accessible_application, get_owned_job
from app.services.application_service import TRANSITIONS, change_status
from app.services.matching_service import score_against_job
from app.services.notification_service import notify
from app.utils.auth import roles_required
from app.utils.helpers import clean_str, get_json, ok, paged_response, parse_datetime, parse_int

bp = Blueprint("applications", __name__, url_prefix="/api")

INTERVIEW_MODES = ("online", "onsite", "phone")
INTERVIEWABLE = {"under_review", "shortlisted", "interview"}


def _candidate_summary(application):
    candidate = application.candidate
    user = candidate.user
    return {
        "name": user.full_name,
        "email": user.email,
        "headline": candidate.headline,
        "location": candidate.location,
        "years_experience": candidate.years_experience,
        "skills": [s.name for s in candidate.skills],
        "education": [e.to_dict() for e in candidate.education],
        "experience": [x.to_dict() for x in candidate.experiences],
    }


def application_detail(application, user):
    data = application.to_dict()
    data.update({
        "cover_note": application.cover_note,
        "match": application.match_details,
        "history": [h.to_dict() for h in application.history],
        "interviews": [i.to_dict() for i in application.interviews],
        "job": application.job.to_dict(),
        "resume": application.resume.to_dict() if application.resume else None,
        "resume_id": application.resume_id,
    })
    if user.role in ("recruiter", "admin"):
        data["candidate"] = _candidate_summary(application)
    return data


@bp.post("/jobs/<int:job_id>/apply")
@roles_required("candidate")
def apply_to_job(job_id):
    job = db.session.get(Job, job_id)
    if job is None:
        raise ApiError("Job not found.", 404)
    if not job.is_public():
        raise ApiError("This job is no longer accepting applications.", 409)

    candidate = g.current_user.candidate_profile
    data = get_json()
    resume_id = parse_int(data.get("resume_id"), "resume_id", 1, 2_147_483_647)
    resume = db.session.get(Resume, resume_id)
    if resume is None or resume.candidate_id != candidate.id or resume.is_deleted:
        raise ApiError("Select one of your active resumes.", 400, {"field": "resume_id"})
    if Application.query.filter_by(job_id=job.id, candidate_id=candidate.id).first():
        raise ApiError("You have already applied to this job.", 409)

    cover_note = clean_str(data, "cover_note", 0, 2000, required=False)
    match = score_against_job(candidate, resume, job)
    application = Application(
        job_id=job.id,
        candidate_id=candidate.id,
        resume_id=resume.id,
        status="applied",
        match_score=match["score"],
        match_details=match,
        cover_note=cover_note,
    )
    application.history.append(
        ApplicationStatusHistory(status="applied", note="Application submitted",
                                 changed_by_user_id=g.current_user.id))
    notify(job.recruiter.user_id, "New application",
           f"{g.current_user.full_name} applied for {job.title}.",
           f"/recruiter/jobs/{job.id}/applicants")
    db.session.add(application)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("You have already applied to this job.", 409)
    return ok(application.to_dict(), 201)


@bp.get("/applications")
@roles_required("candidate")
def my_applications():
    query = Application.query.filter_by(candidate_id=g.current_user.candidate_profile.id)
    status = request.args.get("status")
    if status:
        if status not in APPLICATION_STATUSES:
            raise ApiError("Invalid status filter.", 400)
        query = query.filter(Application.status == status)
    query = query.order_by(Application.applied_at.desc(), Application.id.desc())
    return paged_response(query, lambda a: a.to_dict())


@bp.get("/applications/<int:app_id>")
@roles_required("candidate", "recruiter", "admin")
def get_application(app_id):
    application = get_accessible_application(app_id, g.current_user)
    return ok(application_detail(application, g.current_user))


@bp.post("/applications/<int:app_id>/withdraw")
@roles_required("candidate")
def withdraw_application(app_id):
    application = get_accessible_application(app_id, g.current_user)
    change_status(application, "withdrawn", g.current_user.id, note="Withdrawn by candidate")
    db.session.commit()
    return ok(application_detail(application, g.current_user))


@bp.patch("/applications/<int:app_id>/status")
@roles_required("recruiter")
def update_application_status(app_id):
    application = get_accessible_application(app_id, g.current_user)
    data = get_json()
    new_status = data.get("status")
    if new_status not in APPLICATION_STATUSES or new_status == "withdrawn":
        raise ApiError("Invalid status. Recruiters can set: " +
                       ", ".join(s for s in APPLICATION_STATUSES if s != "withdrawn") + ".", 400,
                       {"field": "status"})
    note = clean_str(data, "note", 0, 500, required=False)
    change_status(application, new_status, g.current_user.id, note)
    db.session.commit()
    return ok(application_detail(application, g.current_user))


@bp.post("/applications/<int:app_id>/interviews")
@roles_required("recruiter")
def schedule_interview(app_id):
    application = get_accessible_application(app_id, g.current_user)
    data = get_json()
    scheduled_at = parse_datetime(data.get("scheduled_at"))
    mode = data.get("mode")
    if mode not in INTERVIEW_MODES:
        raise ApiError("mode must be online, onsite or phone.", 400, {"field": "mode"})
    if application.status not in INTERVIEWABLE:
        raise ApiError("Interviews can be scheduled only for applications under review, shortlisted or in interview.",
                       409)
    if application.status != "interview":
        change_status(application, "interview", g.current_user.id, note="Interview scheduled")
    application.interviews.append(Interview(
        scheduled_at=scheduled_at,
        mode=mode,
        location_or_link=clean_str(data, "location_or_link", 0, 500, required=False),
        notes=clean_str(data, "notes", 0, 1000, required=False),
    ))
    notify(application.candidate.user_id, "Interview scheduled",
           f"An interview has been scheduled for {application.job.title}.", f"/applications/{application.id}")
    db.session.commit()
    return ok(application_detail(application, g.current_user), 201)


@bp.get("/jobs/<int:job_id>/applications")
@roles_required("recruiter")
def job_applicants(job_id):
    job = get_owned_job(job_id, g.current_user)
    query = (
        Application.query.join(CandidateProfile, Application.candidate_id == CandidateProfile.id)
        .join(User, CandidateProfile.user_id == User.id)
        .filter(Application.job_id == job.id)
    )
    status = request.args.get("status")
    if status:
        if status not in APPLICATION_STATUSES:
            raise ApiError("Invalid status filter.", 400)
        query = query.filter(Application.status == status)
    q = request.args.get("q", "").strip()[:100]
    if q:
        query = query.filter(User.full_name.ilike(f"%{q}%"))
    if request.args.get("sort") == "date":
        query = query.order_by(Application.applied_at.desc(), Application.id.desc())
    else:
        query = query.order_by(Application.match_score.desc().nullslast(), Application.id.asc())
    return paged_response(query, lambda a: a.to_dict(include_candidate=True))
