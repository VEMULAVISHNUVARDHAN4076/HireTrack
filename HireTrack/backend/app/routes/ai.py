from flask import Blueprint, g

from app.extensions import db
from app.services.access import get_accessible_application
from app.services.matching_service import latest_active_resume, recommend_jobs, score_against_job
from app.utils.auth import roles_required
from app.utils.helpers import ok

bp = Blueprint("ai", __name__, url_prefix="/api")


@bp.get("/applications/<int:app_id>/match")
@roles_required("candidate", "recruiter", "admin")
def application_match(app_id):
    """Recalculate the match for an application against the resume snapshot and current job data."""
    application = get_accessible_application(app_id, g.current_user)
    result = score_against_job(application.candidate, application.resume, application.job)
    application.match_score = result["score"]
    application.match_details = result
    db.session.commit()
    return ok({"application_id": application.id, "job_id": application.job_id, **result})


@bp.get("/candidate/recommendations")
@roles_required("candidate")
def candidate_recommendations():
    candidate = g.current_user.candidate_profile
    items, message = recommend_jobs(candidate)
    resume = latest_active_resume(candidate)
    return ok({"items": items, "message": message, "resume_used": resume.filename if resume else None})
