import os

import click

from app.extensions import bcrypt, db
from app.errors import ApiError
from app.models import Job, Notification, RecruiterProfile, Skill, User, CandidateProfile
from app.ai.taxonomy import SKILL_VARIANTS
from app.utils.helpers import validate_email, validate_password


def register_cli(app):
    @app.cli.command("init-db")
    def init_db():
        """Create all tables (development shortcut; production uses Flask-Migrate)."""
        db.create_all()
        click.echo("Database tables created.")

    @app.cli.command("create-admin")
    @click.option("--email", prompt=True)
    @click.option("--name", prompt="Full name")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    def create_admin(email, name, password):
        """Create the single administrator account. Admins cannot self-register."""
        try:
            email = validate_email(email)
            password = validate_password(password)
        except ApiError as exc:
            raise click.ClickException(exc.message)
        if User.query.filter_by(email=email).first():
            raise click.ClickException("An account with this email already exists.")
        admin = User(
            email=email,
            full_name=name.strip(),
            role="admin",
            is_verified=True,
            password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
        )
        db.session.add(admin)
        db.session.commit()
        click.echo(f"Administrator {email} created.")

    @app.cli.command("seed-demo")
    def seed_demo():
        """Load demo skills, a recruiter, a candidate and sample jobs for local testing."""
        if User.query.filter_by(email="recruiter@demo.local").first():
            click.echo("Demo data already present.")
            return
        password = os.getenv("DEMO_PASSWORD", "Demo12345")
        skills = {}
        for name in SKILL_VARIANTS:
            skill = Skill(name=name)
            db.session.add(skill)
            skills[name] = skill
        db.session.flush()

        recruiter = User(
            email="recruiter@demo.local", full_name="Demo Recruiter", role="recruiter", is_verified=True,
            password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
        )
        recruiter.recruiter_profile = RecruiterProfile(
            company_name="Acme Analytics", industry="Software", location="Hyderabad",
            description="Data and analytics products for retail.",
        )
        candidate = User(
            email="candidate@demo.local", full_name="Demo Candidate", role="candidate", is_verified=True,
            password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
        )
        candidate.candidate_profile = CandidateProfile(headline="Junior Developer", location="Hyderabad")
        db.session.add_all([recruiter, candidate])
        db.session.flush()

        samples = [
            ("Python Developer", "Build and maintain data pipelines and internal APIs in Python. Experience with SQL and Flask preferred.", ["python", "sql", "flask"], "full_time"),
            ("Frontend Engineer", "Build responsive React interfaces with Tailwind CSS and integrate REST APIs.", ["react", "tailwind css", "javascript", "rest api"], "full_time"),
            ("Data Analyst Intern", "Analyse operational data, build dashboards and communicate findings clearly.", ["sql", "excel", "communication"], "internship"),
        ]
        for title, desc, skill_names, emp in samples:
            job = Job(
                recruiter_id=recruiter.recruiter_profile.id, title=title, description=desc,
                location="Hyderabad", employment_type=emp, experience_min=0,
                skills=[skills[s] for s in skill_names],
            )
            db.session.add(job)
        db.session.add(Notification(user_id=candidate.id, title="Welcome", message="Upload a resume to get started."))
        db.session.commit()
        click.echo(f"Demo accounts created (password from DEMO_PASSWORD or default). Change it before any public use.")
