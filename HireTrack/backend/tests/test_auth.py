from tests.conftest import login, make_user


def test_candidate_registers_and_receives_token(client):
    res = client.post("/api/auth/register", json={
        "role": "candidate", "email": "new@example.com", "password": "Strong123", "full_name": "New Person"})
    assert res.status_code == 201
    body = res.get_json()["data"]
    assert body["user"]["role"] == "candidate"
    assert "password_hash" not in body["user"]
    assert body["access_token"]


def test_admin_cannot_self_register(client):
    res = client.post("/api/auth/register", json={
        "role": "admin", "email": "root@example.com", "password": "Strong123", "full_name": "Root User"})
    assert res.status_code == 400


def test_weak_password_rejected(client):
    res = client.post("/api/auth/register", json={
        "role": "candidate", "email": "weak@example.com", "password": "short", "full_name": "Weak Pw"})
    assert res.status_code == 400


def test_duplicate_email_rejected(client, app):
    make_user("dup@example.com", "candidate")
    res = client.post("/api/auth/register", json={
        "role": "candidate", "email": "DUP@example.com", "password": "Strong123", "full_name": "Dup User"})
    assert res.status_code == 409


def test_wrong_password_returns_generic_error(client, app):
    make_user("login@example.com", "candidate")
    res = client.post("/api/auth/login", json={"email": "login@example.com", "password": "wrong"})
    assert res.status_code == 401
    assert res.get_json()["error"]["message"] == "Invalid email or password."


def test_suspended_user_cannot_log_in_or_use_token(client, app):
    user = make_user("suspend@example.com", "candidate")
    headers = login(client, "suspend@example.com")
    user.is_active = False
    from app.extensions import db
    db.session.commit()
    assert client.get("/api/auth/me", headers=headers).status_code == 403
    assert client.post("/api/auth/login", json={"email": "suspend@example.com",
                                               "password": "Passw0rd1"}).status_code == 403


def test_protected_route_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_change_password(client, app):
    make_user("pw@example.com", "candidate")
    headers = login(client, "pw@example.com")
    res = client.post("/api/auth/change-password", headers=headers,
                      json={"current_password": "Passw0rd1", "new_password": "NewPassw0rd"})
    assert res.status_code == 200
    login(client, "pw@example.com", "NewPassw0rd")
