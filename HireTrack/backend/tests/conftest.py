import io
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app  # noqa: E402
from app.extensions import bcrypt, db  # noqa: E402
from config import TestConfig  # noqa: E402
from app.models import CandidateProfile, RecruiterProfile, User  # noqa: E402


@pytest.fixture()
def app():
    application = create_app(TestConfig)
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def make_user(email, role, password="Passw0rd1", verified=True, name="Test User"):
    user = User(email=email, full_name=name, role=role, is_verified=verified,
                password_hash=bcrypt.generate_password_hash(password).decode())
    if role == "candidate":
        user.candidate_profile = CandidateProfile()
    elif role == "recruiter":
        user.recruiter_profile = RecruiterProfile(company_name="Acme Corp")
    db.session.add(user)
    db.session.commit()
    return user


def login(client, email, password="Passw0rd1"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.get_json()
    return {"Authorization": f"Bearer {res.get_json()['data']['access_token']}"}


def sample_docx_bytes(text):
    from docx import Document

    document = Document()
    for line in text.split("\n"):
        document.add_paragraph(line)
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def sample_pdf_bytes(text):
    import fitz

    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), text)
    data = document.tobytes()
    document.close()
    return data
