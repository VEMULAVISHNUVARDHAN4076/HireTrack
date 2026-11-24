from datetime import date

from flask import Blueprint, g, request
from sqlalchemy import or_

from app.errors import ApiError
from app.extensions import db
from app.models import EMPLOYMENT_TYPES, Application, Job, RecruiterProfile, SavedJob, Skill, utcnow
from app.routes.profile import get_or_create_skill, skill_names_from
from app.services.access import get_owned_job
from app.utils.auth import optional_user, roles_required
from app.utils.helpers import clean_str, get_json, ok, paged_response, parse_deadline, parse_int

bp = Blueprint("jobs", __name__, url_prefix="/api")

SORT_OPTIONS = {
    "newest": lambda: Job.created_at.desc(),
    "title": lambda: Job.title.asc(),
    "deadline": lambda: Job.deadline.asc().nullslast(),
    "experience": lambda: Job.experience_min.asc(),
}
MAX_JOB_SKILLS = 30


def _public_jobs_query():
    return (
        Job.query.join(RecruiterProfile, Job.recruiter_id == RecruiterProfile.id)
        .filter(Job.status == "open", or_(Job.deadline.is_(None), Job.deadline >= date.today()))
    )


def _apply_job_fields(job, data):
    job.title = clean_str(data, "title", 3, 150)
    job.description = clean_str(data, "description", 20, 10000)
    job.location = clean_str(data, "location", 2, 120)
    employment_type = data.get("employment_type")
    if employment_type not in EMPLOYMENT_TYPES:
        raise ApiError(f"employment_type must be one of: {', '.join(EMPLOYMENT_TYPES)}.", 400,
                       {"field": "employment_type"})
    job.employment_type = employment_type
    job.experience_min = parse_int(data.get("experience_min", 0), "experience_min", 0, 50)
    job.salary_range = clean_str(data, "salary_range", 0, 80, required=False)
    job.deadline = parse_deadline(data.get("deadline"))
    names = skill_names_from(data.get("skills"), MAX_JOB_SKILLS) or []
    job.skills = [get_or_create_skill(name) for name in names]


def _get_job_or_404(job_id):
    job = db.session.get(Job, job_id)
    if job is None:
        raise ApiError("Job not found.", 404)
    return job


@bp.get("/jobs")
def list_jobs():
    query = _public_jobs_query()
    q = request.args.get("q", "").strip()[:100]
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Job.title.ilike(like), Job.description.ilike(like),
                                 RecruiterProfile.company_name.ilike(like)))
    location = request.args.get("location", "").strip()[:120]
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    employment_type = request.args.get("employment_type")
    if employment_type:
        if employment_type not in EMPLOYMENT_TYPES:
            raise ApiError("Invalid employment_type filter.", 400)
        query = query.filter(Job.employment_type == employment_type)
    skill = request.args.get("skill", "").strip().lower()[:100]
    if skill:
        query = query.filter(Job.skills.any(Skill.name == skill))
    sort = SORT_OPTIONS.get(request.args.get("sort", "newest"), SORT_OPTIONS["newest"])
    query = query.order_by(sort(), Job.id.desc())
    return paged_response(query, lambda job: job.to_dict())


@bp.get("/jobs/<int:job_id>")
def get_job(job_id):
    user = optional_user()
    job = _get_job_or_404(job_id)
    is_owner = user is not None and user.role == "recruiter" and job.recruiter_id == user.recruiter_profile.id
    if not job.is_public() and not (is_owner or (user and user.role == "admin")):
        raise ApiError("Job not found.", 404)
    data = job.to_dict()
    if user is not None and user.role == "candidate":
        candidate_id = user.candidate_profile.id
        data["has_applied"] = Application.query.filter_by(job_id=job.id, candidate_id=candidate_id).first() is not None
        data["is_saved"] = SavedJob.query.filter_by(job_id=job.id, candidate_id=candidate_id).first() is not None
    return ok(data)


@bp.post("/jobs")
@roles_required("recruiter")
def create_job():
    if not g.current_user.is_verified:
        raise ApiError("Your recruiter account must be verified by an administrator before posting jobs.", 403)
    data = get_json()
    job = Job(recruiter_id=g.current_user.recruiter_profile.id)
    _apply_job_fields(job, data)
    db.session.add(job)
    db.session.commit()
    return ok(job.to_dict(), 201)


@bp.put("/jobs/<int:job_id>")
@roles_required("recruiter")
def update_job(job_id):
    job = get_owned_job(job_id, g.current_user)
    if job.status == "removed":
        raise ApiError("This job was removed by an administrator and cannot be edited.", 409)
    _apply_job_fields(job, get_json())
    db.session.commit()
    return ok(job.to_dict())


@bp.post("/jobs/<int:job_id>/close")
@roles_required("recruiter")
def close_job(job_id):
    job = get_owned_job(job_id, g.current_user)
    if job.status == "removed":
        raise ApiError("This job was removed by an administrator.", 409)
    job.status = "closed"
    job.closed_at = utcnow()
    db.session.commit()
    return ok(job.to_dict())


@bp.post("/jobs/<int:job_id>/reopen")
@roles_required("recruiter")
def reopen_job(job_id):
    job = get_owned_job(job_id, g.current_user)
    if job.status == "removed":
        raise ApiError("This job was removed by an administrator.", 409)
    if job.deadline and job.deadline < date.today():
        raise ApiError("The deadline has passed. Update the deadline before reopening.", 409)
    job.status = "open"
    job.closed_at = None
    db.session.commit()
    return ok(job.to_dict())


@bp.delete("/jobs/<int:job_id>")
@roles_required("recruiter")
def delete_job(job_id):
    job = get_owned_job(job_id, g.current_user)
    if job.applications:
        raise ApiError("This job has applications. Close it instead of deleting it.", 409)
    db.session.delete(job)
    db.session.commit()
    return ok({"message": "Job deleted."})


@bp.get("/recruiter/jobs")
@roles_required("recruiter")
def my_jobs():
    query = Job.query.filter(Job.recruiter_id == g.current_user.recruiter_profile.id)
    status = request.args.get("status")
    if status:
        if status not in ("open", "closed", "removed"):
            raise ApiError("Invalid status filter.", 400)
        query = query.filter(Job.status == status)
    query = query.order_by(Job.created_at.desc(), Job.id.desc())
    return paged_response(query, lambda job: job.to_dict(include_applicants=True))


@bp.post("/jobs/<int:job_id>/save")
@roles_required("candidate")
def save_job(job_id):
    job = _get_job_or_404(job_id)
    if not job.is_public():
        raise ApiError("Only open jobs can be saved.", 409)
    candidate_id = g.current_user.candidate_profile.id
    if SavedJob.query.filter_by(job_id=job.id, candidate_id=candidate_id).first() is None:
        db.session.add(SavedJob(job_id=job.id, candidate_id=candidate_id))
        db.session.commit()
    return ok({"message": "Job saved."}, 201)


@bp.delete("/jobs/<int:job_id>/save")
@roles_required("candidate")
def unsave_job(job_id):
    candidate_id = g.current_user.candidate_profile.id
    SavedJob.query.filter_by(job_id=job_id, candidate_id=candidate_id).delete()
    db.session.commit()
    return ok({"message": "Job removed from saved list."})


@bp.get("/saved-jobs")
@roles_required("candidate")
def saved_jobs():
    query = (
        Job.query.join(SavedJob, SavedJob.job_id == Job.id)
        .filter(SavedJob.candidate_id == g.current_user.candidate_profile.id)
        .order_by(SavedJob.saved_at.desc())
    )
    return paged_response(query, lambda job: job.to_dict())
