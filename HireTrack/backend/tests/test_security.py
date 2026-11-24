import io

from tests.conftest import login, make_user, sample_docx_bytes


def test_candidate_cannot_see_another_candidates_resume(client, app):
    make_user("a@example.com", "candidate")
    make_user("b@example.com", "candidate")
    a = login(client, "a@example.com")
    b = login(client, "b@example.com")
    upload = client.post("/api/resumes", headers=a,
                         data={"file": (io.BytesIO(sample_docx_bytes("Private resume text here")), "a.docx")},
                         content_type="multipart/form-data")
    resume_id = upload.get_json()["data"]["id"]
    assert client.get(f"/api/resumes/{resume_id}/download", headers=b).status_code == 404
    assert client.delete(f"/api/resumes/{resume_id}", headers=b).status_code == 404


def test_recruiter_cannot_edit_another_recruiters_job(client, app):
    make_user("r1@example.com", "recruiter")
    make_user("r2@example.com", "recruiter")
    r1 = login(client, "r1@example.com")
    r2 = login(client, "r2@example.com")
    job_id = client.post("/api/jobs", headers=r1, json={
        "title": "Data Analyst", "description": "Analyse data and build dashboards for business teams daily.",
        "location": "Remote", "employment_type": "contract"}).get_json()["data"]["id"]
    assert client.put(f"/api/jobs/{job_id}", headers=r2, json={
        "title": "Hacked title", "description": "Hacked description text that is long enough to pass.",
        "location": "Remote", "employment_type": "contract"}).status_code == 404


def test_candidate_cannot_access_admin_routes(client, app):
    make_user("c@example.com", "candidate")
    headers = login(client, "c@example.com")
    assert client.get("/api/admin/stats", headers=headers).status_code == 403


def test_admin_can_verify_recruiter_and_suspend_user(client, app):
    make_user("admin@example.com", "admin")
    make_user("pending@example.com", "recruiter", verified=False)
    make_user("victim@example.com", "candidate")
    admin = login(client, "admin@example.com")
    pending = client.get("/api/admin/users?state=pending", headers=admin).get_json()["data"]
    rid = pending[0]["id"]
    assert client.patch(f"/api/admin/users/{rid}", headers=admin, json={"is_verified": True}).status_code == 200
    from app.models import User
    victim = User.query.filter_by(email="victim@example.com").first()
    assert client.patch(f"/api/admin/users/{victim.id}", headers=admin,
                        json={"is_active": False}).status_code == 200


def test_sql_metacharacters_in_search_are_safe(client, app):
    res = client.get("/api/jobs?q=' OR 1=1 --&skill=x'; DROP TABLE users;--")
    assert res.status_code == 200


def test_error_responses_do_not_leak_stack_traces(client, app):
    res = client.get("/api/jobs/999999")
    assert res.status_code == 404
    assert "Traceback" not in res.get_data(as_text=True)


def test_security_headers_present(client, app):
    res = client.get("/api/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
