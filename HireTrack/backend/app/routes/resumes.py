import io

from flask import Blueprint, current_app, g, request, send_file

from app.errors import ApiError
from app.extensions import db
from app.models import Application, Resume
from app.services.access import can_access_resume
from app.services.resume_service import extract_text, validate_upload
from app.utils.auth import roles_required
from app.utils.helpers import ok

bp = Blueprint("resumes", __name__, url_prefix="/api/resumes")


def _active_resumes(candidate):
    return Resume.query.filter_by(candidate_id=candidate.id, is_deleted=False)


def _get_resume(resume_id):
    resume = db.session.get(Resume, resume_id)
    if resume is None:
        raise ApiError("Resume not found.", 404)
    return resume


@bp.get("")
@roles_required("candidate")
def list_resumes():
    resumes = _active_resumes(g.current_user.candidate_profile).order_by(Resume.uploaded_at.desc()).all()
    return ok([r.to_dict() for r in resumes])


@bp.post("")
@roles_required("candidate")
def upload_resume():
    file = request.files.get("file")
    if file is None:
        raise ApiError("Attach the resume as multipart field 'file'.", 400, {"field": "file"})
    candidate = g.current_user.candidate_profile
    if _active_resumes(candidate).count() >= current_app.config["MAX_RESUMES_PER_CANDIDATE"]:
        raise ApiError("You have reached the maximum number of resumes. Delete one before uploading.", 409)

    data = file.read()
    filename, ext = validate_upload(file.filename, data, current_app.config["RESUME_MAX_BYTES"])
    text = extract_text(ext, data)
    mime = "application/pdf" if ext == "pdf" else (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    resume = Resume(candidate_id=candidate.id, filename=filename, mime_type=mime, size_bytes=len(data),
                    content=data, extracted_text=text)
    db.session.add(resume)
    db.session.commit()
    return ok(resume.to_dict(), 201)


@bp.delete("/<int:resume_id>")
@roles_required("candidate")
def delete_resume(resume_id):
    resume = _get_resume(resume_id)
    if resume.candidate_id != g.current_user.candidate_profile.id or resume.is_deleted:
        raise ApiError("Resume not found.", 404)
    in_use = Application.query.filter_by(resume_id=resume.id).first() is not None
    if in_use:
        # Keep the file for applications that already reference it (audit and recruiter view).
        resume.is_deleted = True
    else:
        db.session.delete(resume)
    db.session.commit()
    return ok({"message": "Resume deleted."})


@bp.get("/<int:resume_id>/download")
@roles_required("candidate", "recruiter", "admin")
def download_resume(resume_id):
    resume = _get_resume(resume_id)
    if not can_access_resume(g.current_user, resume):
        raise ApiError("Resume not found.", 404)
    return send_file(
        io.BytesIO(resume.content),
        mimetype=resume.mime_type,
        as_attachment=True,
        download_name=resume.filename,
    )
