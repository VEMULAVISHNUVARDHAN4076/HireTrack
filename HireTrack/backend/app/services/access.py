from app.errors import ApiError
from app.extensions import db
from app.models import Application, Job


def get_owned_job(job_id, user):
    """Recruiters may only manage their own jobs. Missing and foreign jobs both return 404."""
    job = db.session.get(Job, job_id)
    if job is None or job.recruiter_id != user.recruiter_profile.id:
        raise ApiError("Job not found.", 404)
    return job


def get_accessible_application(app_id, user):
    application = db.session.get(Application, app_id)
    if application is None:
        raise ApiError("Application not found.", 404)
    if user.role == "admin":
        return application
    if user.role == "candidate" and application.candidate_id == user.candidate_profile.id:
        return application
    if user.role == "recruiter" and application.job.recruiter_id == user.recruiter_profile.id:
        return application
    raise ApiError("Application not found.", 404)


def can_access_resume(user, resume):
    if user.role == "admin":
        return True
    if user.role == "candidate":
        return resume.candidate_id == user.candidate_profile.id
    if user.role == "recruiter":
        return (
            Application.query.join(Job, Application.job_id == Job.id)
            .filter(Application.resume_id == resume.id, Job.recruiter_id == user.recruiter_profile.id)
            .first()
            is not None
        )
    return False
