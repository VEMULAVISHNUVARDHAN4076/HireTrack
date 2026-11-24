from datetime import date

from flask import current_app
from sqlalchemy import or_

from app.ai.matcher import compute_match
from app.models import Job, Resume


def build_candidate_text(candidate, resume):
    """Combine the resume text with declared profile skills so both sources count."""
    parts = []
    if resume is not None and resume.extracted_text:
        parts.append(resume.extracted_text)
    declared = sorted(skill.name for skill in candidate.skills)
    if declared:
        parts.append("Skills: " + ", ".join(declared))
    return "\n".join(parts), declared


def score_against_job(candidate, resume, job):
    text, declared = build_candidate_text(candidate, resume)
    result = compute_match(text, job.title, job.description, [s.name for s in job.skills])
    result["declared_skills"] = declared
    return result


def latest_active_resume(candidate):
    return (
        Resume.query.filter_by(candidate_id=candidate.id, is_deleted=False)
        .order_by(Resume.uploaded_at.desc(), Resume.id.desc())
        .first()
    )


def recommend_jobs(candidate, limit=10):
    resume = latest_active_resume(candidate)
    text, _ = build_candidate_text(candidate, resume)
    if not text.strip():
        return [], "Upload a resume or add skills to your profile to receive recommendations."

    applied_job_ids = {application.job_id for application in candidate.applications}
    # Only open, unexpired jobs are considered. Results are computed per request,
    # so they always reflect the latest profile and job data.
    jobs = Job.query.filter(
        Job.status == "open",
        or_(Job.deadline.is_(None), Job.deadline >= date.today()),
    ).all()
    threshold = current_app.config["MATCH_RECOMMEND_MIN_SCORE"]
    results = []
    for job in jobs:
        result = score_against_job(candidate, resume, job)
        if result["score"] < threshold:
            continue
        required_count = len(job.skills)
        if required_count:
            reason = (f"{len(result['matched_skills'])} of {required_count} listed skills match your resume "
                      "and profile.")
        else:
            reason = "Ranked by overall text similarity with your resume."
        results.append({
            "job": job.to_dict(),
            "score": result["score"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
            "unconfirmed_skills": result["unconfirmed_skills"],
            "reason": reason,
            "already_applied": job.id in applied_job_ids,
        })
    results.sort(key=lambda item: item["score"], reverse=True)
    message = None if results else "No open jobs currently match your profile closely enough."
    return results[:limit], message
