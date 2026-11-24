"""End-to-end API workflow: recruiter posts job, candidate applies, recruiter shortlists."""
import io

from tests.conftest import login, make_user, sample_docx_bytes
from app.extensions import db
from app.models import Notification

RESUME_TEXT = (
    "Priya Sharma. Backend developer with three years of experience. Skills: Python, Flask, SQL, "
    "PostgreSQL, Docker and REST APIs. Built reporting services and automated tests with pytest for "
    "internal teams. Good communication and teamwork across product and design groups."
)


def _job_payload(**overrides):
    payload = {
        "title": "Python Backend Developer",
        "description": "We are hiring a Python developer to build Flask APIs backed by PostgreSQL.",
        "location": "Hyderabad",
        "employment_type": "full_time",
        "experience_min": 1,
        "skills": ["Python", "Flask", "PostgreSQL", "Kubernetes"],
    }
    payload.update(overrides)
    return payload


def _setup(client, app):
    make_user("rec@example.com", "recruiter", name="Recruiter One")
    make_user("cand@example.com", "candidate", name="Priya Sharma")
    rec = login(client, "rec@example.com")
    cand = login(client, "cand@example.com")
    return rec, cand


def test_unverified_recruiter_cannot_post_jobs(client, app):
    make_user("pending@example.com", "recruiter", verified=False)
    headers = login(client, "pending@example.com")
    assert client.post("/api/jobs", headers=headers, json=_job_payload()).status_code == 403


def test_full_application_lifecycle(client, app):
    rec, cand = _setup(client, app)

    job = client.post("/api/jobs", headers=rec, json=_job_payload())
    assert job.status_code == 201
    job_id = job.get_json()["data"]["id"]

    public = client.get("/api/jobs?q=python&skill=flask")
    assert public.status_code == 200
    assert public.get_json()["meta"]["total"] == 1

    upload = client.post("/api/resumes", headers=cand,
                         data={"file": (io.BytesIO(sample_docx_bytes(RESUME_TEXT)), "cv.docx")},
                         content_type="multipart/form-data")
    assert upload.status_code == 201, upload.get_json()
    resume_id = upload.get_json()["data"]["id"]

    applied = client.post(f"/api/jobs/{job_id}/apply", headers=cand, json={"resume_id": resume_id})
    assert applied.status_code == 201
    app_id = applied.get_json()["data"]["id"]
    assert applied.get_json()["data"]["match_score"] > 0

    duplicate = client.post(f"/api/jobs/{job_id}/apply", headers=cand, json={"resume_id": resume_id})
    assert duplicate.status_code == 409

    listing = client.get(f"/api/jobs/{job_id}/applications", headers=rec)
    assert listing.status_code == 200
    assert listing.get_json()["data"][0]["candidate_name"] == "Priya Sharma"

    shortlist = client.patch(f"/api/applications/{app_id}/status", headers=rec,
                             json={"status": "shortlisted", "note": "Strong Flask background"})
    assert shortlist.status_code == 200
    assert shortlist.get_json()["data"]["status"] == "shortlisted"

    illegal = client.patch(f"/api/applications/{app_id}/status", headers=rec, json={"status": "applied"})
    assert illegal.status_code == 409

    match = client.get(f"/api/applications/{app_id}/match", headers=cand)
    assert match.status_code == 200
    assert "Kubernetes" not in match.get_json()["data"]["matched_skills"]
    assert "kubernetes" in match.get_json()["data"]["missing_skills"] + match.get_json()["data"]["unconfirmed_skills"]

    withdrawn = client.post(f"/api/applications/{app_id}/withdraw", headers=cand)
    assert withdrawn.status_code == 200
    assert withdrawn.get_json()["data"]["status"] == "withdrawn"


def test_job_with_applications_cannot_be_deleted(client, app):
    rec, cand = _setup(client, app)
    job_id = client.post("/api/jobs", headers=rec, json=_job_payload()).get_json()["data"]["id"]
    upload = client.post("/api/resumes", headers=cand,
                         data={"file": (io.BytesIO(sample_docx_bytes(RESUME_TEXT)), "cv.docx")},
                         content_type="multipart/form-data")
    client.post(f"/api/jobs/{job_id}/apply", headers=cand, json={"resume_id": upload.get_json()["data"]["id"]})
    assert client.delete(f"/api/jobs/{job_id}", headers=rec).status_code == 409


def test_closed_jobs_are_hidden_and_not_applicable(client, app):
    rec, cand = _setup(client, app)
    job_id = client.post("/api/jobs", headers=rec, json=_job_payload()).get_json()["data"]["id"]
    client.post(f"/api/jobs/{job_id}/close", headers=rec)
    assert client.get("/api/jobs").get_json()["meta"]["total"] == 0
    assert client.get(f"/api/jobs/{job_id}", headers=cand).status_code == 404


def test_recommendations_exclude_closed_jobs(client, app):
    rec, cand = _setup(client, app)
    job_id = client.post("/api/jobs", headers=rec, json=_job_payload()).get_json()["data"]["id"]
    upload = client.post("/api/resumes", headers=cand,
                         data={"file": (io.BytesIO(sample_docx_bytes(RESUME_TEXT)), "cv.docx")},
                         content_type="multipart/form-data")
    assert upload.status_code == 201
    first = client.get("/api/candidate/recommendations", headers=cand).get_json()["data"]["items"]
    assert any(item["job"]["id"] == job_id for item in first)
    client.post(f"/api/jobs/{job_id}/close", headers=rec)
    second = client.get("/api/candidate/recommendations", headers=cand).get_json()["data"]["items"]
    assert all(item["job"]["id"] != job_id for item in second)


def test_notifications_created_on_apply_and_status_change(client, app):
    rec, cand = _setup(client, app)
    job_id = client.post("/api/jobs", headers=rec, json=_job_payload()).get_json()["data"]["id"]
    upload = client.post("/api/resumes", headers=cand,
                         data={"file": (io.BytesIO(sample_docx_bytes(RESUME_TEXT)), "cv.docx")},
                         content_type="multipart/form-data")
    app_id = client.post(f"/api/jobs/{job_id}/apply", headers=cand,
                         json={"resume_id": upload.get_json()["data"]["id"]}).get_json()["data"]["id"]
    client.patch(f"/api/applications/{app_id}/status", headers=rec, json={"status": "rejected"})
    assert Notification.query.count() >= 2
    unread = client.get("/api/notifications?unread=true", headers=cand).get_json()
    assert unread["unread_count"] >= 1
