from datetime import date, datetime, timezone

from app.extensions import db


def utcnow():
    return datetime.now(timezone.utc)


def iso(value):
    return value.isoformat() if value else None


job_skills = db.Table(
    "job_skills",
    db.Column("job_id", db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True),
    db.Column("skill_id", db.Integer, db.ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
)

candidate_skills = db.Table(
    "candidate_skills",
    db.Column("candidate_id", db.Integer, db.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), primary_key=True),
    db.Column("skill_id", db.Integer, db.ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
)

EMPLOYMENT_TYPES = ("full_time", "part_time", "contract", "internship")
JOB_STATUSES = ("open", "closed", "removed")
APPLICATION_STATUSES = ("applied", "under_review", "shortlisted", "interview", "offered", "rejected", "withdrawn")


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (db.CheckConstraint("role IN ('candidate','recruiter','admin')", name="ck_users_role"),)

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    last_login_at = db.Column(db.DateTime(timezone=True))

    candidate_profile = db.relationship("CandidateProfile", back_populates="user", uselist=False,
                                        cascade="all, delete-orphan")
    recruiter_profile = db.relationship("RecruiterProfile", back_populates="user", uselist=False,
                                        cascade="all, delete-orphan")
    notifications = db.relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": iso(self.created_at),
        }


class CandidateProfile(db.Model):
    __tablename__ = "candidate_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    headline = db.Column(db.String(150))
    phone = db.Column(db.String(30))
    location = db.Column(db.String(120))
    summary = db.Column(db.Text)
    years_experience = db.Column(db.Integer, nullable=False, default=0)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    user = db.relationship("User", back_populates="candidate_profile")
    education = db.relationship("Education", back_populates="candidate", cascade="all, delete-orphan",
                                order_by="Education.id")
    experiences = db.relationship("Experience", back_populates="candidate", cascade="all, delete-orphan",
                                  order_by="Experience.id")
    skills = db.relationship("Skill", secondary=candidate_skills, order_by="Skill.name")
    resumes = db.relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")
    applications = db.relationship("Application", back_populates="candidate")
    saved_jobs = db.relationship("SavedJob", back_populates="candidate", cascade="all, delete-orphan")


class Education(db.Model):
    __tablename__ = "education"

    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False,
                             index=True)
    institution = db.Column(db.String(150), nullable=False)
    degree = db.Column(db.String(120), nullable=False)
    field_of_study = db.Column(db.String(120))
    start_year = db.Column(db.Integer)
    end_year = db.Column(db.Integer)

    candidate = db.relationship("CandidateProfile", back_populates="education")

    def to_dict(self):
        return {"id": self.id, "institution": self.institution, "degree": self.degree,
                "field_of_study": self.field_of_study, "start_year": self.start_year, "end_year": self.end_year}


class Experience(db.Model):
    __tablename__ = "experience"

    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False,
                             index=True)
    title = db.Column(db.String(120), nullable=False)
    company = db.Column(db.String(150), nullable=False)
    start_year = db.Column(db.Integer)
    end_year = db.Column(db.Integer)
    is_current = db.Column(db.Boolean, nullable=False, default=False)
    description = db.Column(db.Text)

    candidate = db.relationship("CandidateProfile", back_populates="experiences")

    def to_dict(self):
        return {"id": self.id, "title": self.title, "company": self.company, "start_year": self.start_year,
                "end_year": self.end_year, "is_current": self.is_current, "description": self.description}


class RecruiterProfile(db.Model):
    __tablename__ = "recruiter_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    company_name = db.Column(db.String(150), nullable=False)
    website = db.Column(db.String(255))
    industry = db.Column(db.String(120))
    location = db.Column(db.String(120))
    description = db.Column(db.Text)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    user = db.relationship("User", back_populates="recruiter_profile")
    jobs = db.relationship("Job", back_populates="recruiter", cascade="all, delete-orphan")

    def to_dict(self):
        return {"company_name": self.company_name, "website": self.website, "industry": self.industry,
                "location": self.location, "description": self.description}


class Skill(db.Model):
    __tablename__ = "skills"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True, index=True)


class Job(db.Model):
    __tablename__ = "jobs"
    __table_args__ = (
        db.CheckConstraint("status IN ('open','closed','removed')", name="ck_jobs_status"),
        db.CheckConstraint("employment_type IN ('full_time','part_time','contract','internship')",
                           name="ck_jobs_employment_type"),
    )

    id = db.Column(db.Integer, primary_key=True)
    recruiter_id = db.Column(db.Integer, db.ForeignKey("recruiter_profiles.id", ondelete="CASCADE"), nullable=False,
                             index=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(120), nullable=False, index=True)
    employment_type = db.Column(db.String(20), nullable=False, index=True)
    experience_min = db.Column(db.Integer, nullable=False, default=0)
    salary_range = db.Column(db.String(80))
    status = db.Column(db.String(20), nullable=False, default="open", index=True)
    deadline = db.Column(db.Date)
    removal_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    closed_at = db.Column(db.DateTime(timezone=True))

    recruiter = db.relationship("RecruiterProfile", back_populates="jobs")
    skills = db.relationship("Skill", secondary=job_skills, order_by="Skill.name")
    applications = db.relationship("Application", back_populates="job")

    def is_public(self):
        return self.status == "open" and (self.deadline is None or self.deadline >= date.today())

    def to_dict(self, include_applicants=False):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "location": self.location,
            "employment_type": self.employment_type,
            "experience_min": self.experience_min,
            "salary_range": self.salary_range,
            "status": self.status,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "company_name": self.recruiter.company_name,
            "recruiter_id": self.recruiter_id,
            "skills": [s.name for s in self.skills],
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
            "is_public": self.is_public(),
        }
        if include_applicants:
            data["applicant_count"] = len(self.applications)
        if self.status == "removed":
            data["removal_reason"] = self.removal_reason
        return data


class Resume(db.Model):
    __tablename__ = "resumes"

    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False,
                             index=True)
    filename = db.Column(db.String(255), nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    size_bytes = db.Column(db.Integer, nullable=False)
    content = db.Column(db.LargeBinary, nullable=False)
    extracted_text = db.Column(db.Text, nullable=False)
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)
    uploaded_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    candidate = db.relationship("CandidateProfile", back_populates="resumes")

    def to_dict(self):
        return {"id": self.id, "filename": self.filename, "mime_type": self.mime_type,
                "size_bytes": self.size_bytes, "uploaded_at": iso(self.uploaded_at)}


class Application(db.Model):
    __tablename__ = "applications"
    __table_args__ = (
        db.UniqueConstraint("job_id", "candidate_id", name="uq_application_job_candidate"),
        db.CheckConstraint(
            "status IN ('applied','under_review','shortlisted','interview','offered','rejected','withdrawn')",
            name="ck_applications_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id"), nullable=False, index=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    resume_id = db.Column(db.Integer, db.ForeignKey("resumes.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="applied", index=True)
    match_score = db.Column(db.Float)
    match_details = db.Column(db.JSON)
    cover_note = db.Column(db.Text)
    applied_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    job = db.relationship("Job", back_populates="applications")
    candidate = db.relationship("CandidateProfile", back_populates="applications")
    resume = db.relationship("Resume")
    history = db.relationship("ApplicationStatusHistory", back_populates="application",
                              cascade="all, delete-orphan", order_by="ApplicationStatusHistory.id")
    interviews = db.relationship("Interview", back_populates="application", cascade="all, delete-orphan",
                                 order_by="Interview.scheduled_at")

    def to_dict(self, include_candidate=False):
        data = {
            "id": self.id,
            "job_id": self.job_id,
            "job_title": self.job.title,
            "company_name": self.job.recruiter.company_name,
            "job_status": self.job.status,
            "status": self.status,
            "match_score": round(self.match_score) if self.match_score is not None else None,
            "resume_filename": self.resume.filename if self.resume else None,
            "applied_at": iso(self.applied_at),
            "updated_at": iso(self.updated_at),
        }
        if include_candidate:
            user = self.candidate.user
            data.update({
                "candidate_id": self.candidate_id,
                "candidate_name": user.full_name,
                "candidate_email": user.email,
                "candidate_headline": self.candidate.headline,
                "candidate_location": self.candidate.location,
            })
        return data


class ApplicationStatusHistory(db.Model):
    __tablename__ = "application_status_history"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False,
                               index=True)
    status = db.Column(db.String(20), nullable=False)
    note = db.Column(db.String(500))
    changed_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    changed_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    application = db.relationship("Application", back_populates="history")

    def to_dict(self):
        return {"status": self.status, "note": self.note, "changed_at": iso(self.changed_at)}


class Interview(db.Model):
    __tablename__ = "interviews"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False,
                               index=True)
    scheduled_at = db.Column(db.DateTime(timezone=True), nullable=False)
    mode = db.Column(db.String(20), nullable=False)
    location_or_link = db.Column(db.String(500))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    application = db.relationship("Application", back_populates="interviews")

    def to_dict(self):
        return {"id": self.id, "scheduled_at": iso(self.scheduled_at), "mode": self.mode,
                "location_or_link": self.location_or_link, "notes": self.notes}


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    link = db.Column(db.String(255))
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    user = db.relationship("User", back_populates="notifications")

    __table_args__ = (db.Index("ix_notifications_user_read", "user_id", "is_read"),)

    def to_dict(self):
        return {"id": self.id, "title": self.title, "message": self.message, "link": self.link,
                "is_read": self.is_read, "created_at": iso(self.created_at)}


class SavedJob(db.Model):
    __tablename__ = "saved_jobs"

    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), primary_key=True)
    saved_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    job = db.relationship("Job")
    candidate = db.relationship("CandidateProfile", back_populates="saved_jobs")


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    action = db.Column(db.String(80), nullable=False, index=True)
    target_type = db.Column(db.String(40), nullable=False)
    target_id = db.Column(db.Integer)
    details = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)

    def to_dict(self):
        return {"id": self.id, "actor_user_id": self.actor_user_id, "action": self.action,
                "target_type": self.target_type, "target_id": self.target_id, "details": self.details,
                "created_at": iso(self.created_at)}
