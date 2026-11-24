-- HireTrack PostgreSQL schema (reference DDL; the SQLAlchemy models in backend/app/models.py are the source of truth).
-- Create with:  psql "$DATABASE_URL" -f database/schema.sql

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('candidate','recruiter','admin')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at   TIMESTAMPTZ
);

CREATE TABLE candidate_profiles (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    headline         VARCHAR(150),
    phone            VARCHAR(30),
    location         VARCHAR(120),
    summary          TEXT,
    years_experience INTEGER NOT NULL DEFAULT 0,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE education (
    id              SERIAL PRIMARY KEY,
    candidate_id    INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    institution     VARCHAR(150) NOT NULL,
    degree          VARCHAR(120) NOT NULL,
    field_of_study  VARCHAR(120),
    start_year      INTEGER,
    end_year        INTEGER
);
CREATE INDEX ix_education_candidate ON education(candidate_id);

CREATE TABLE experience (
    id            SERIAL PRIMARY KEY,
    candidate_id  INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    title         VARCHAR(120) NOT NULL,
    company       VARCHAR(150) NOT NULL,
    start_year    INTEGER,
    end_year      INTEGER,
    is_current    BOOLEAN NOT NULL DEFAULT FALSE,
    description   TEXT
);
CREATE INDEX ix_experience_candidate ON experience(candidate_id);

CREATE TABLE recruiter_profiles (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name  VARCHAR(150) NOT NULL,
    website       VARCHAR(255),
    industry      VARCHAR(120),
    location      VARCHAR(120),
    description   TEXT,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE skills (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE candidate_skills (
    candidate_id  INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    skill_id      INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE jobs (
    id              SERIAL PRIMARY KEY,
    recruiter_id    INTEGER NOT NULL REFERENCES recruiter_profiles(id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,
    description     TEXT NOT NULL,
    location        VARCHAR(120) NOT NULL,
    employment_type VARCHAR(20) NOT NULL CHECK (employment_type IN ('full_time','part_time','contract','internship')),
    experience_min  INTEGER NOT NULL DEFAULT 0,
    salary_range    VARCHAR(80),
    status          VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','removed')),
    deadline        DATE,
    removal_reason  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ
);
CREATE INDEX ix_jobs_recruiter ON jobs(recruiter_id);
CREATE INDEX ix_jobs_status ON jobs(status);
CREATE INDEX ix_jobs_location ON jobs(location);
CREATE INDEX ix_jobs_employment_type ON jobs(employment_type);

CREATE TABLE job_skills (
    job_id    INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id  INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE resumes (
    id              SERIAL PRIMARY KEY,
    candidate_id    INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size_bytes      INTEGER NOT NULL,
    content         BYTEA NOT NULL,
    extracted_text  TEXT NOT NULL,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_resumes_candidate ON resumes(candidate_id);

CREATE TABLE applications (
    id            SERIAL PRIMARY KEY,
    job_id        INTEGER NOT NULL REFERENCES jobs(id),
    candidate_id  INTEGER NOT NULL REFERENCES candidate_profiles(id),
    resume_id     INTEGER NOT NULL REFERENCES resumes(id),
    status        VARCHAR(20) NOT NULL DEFAULT 'applied' CHECK (status IN
                  ('applied','under_review','shortlisted','interview','offered','rejected','withdrawn')),
    match_score   DOUBLE PRECISION,
    match_details JSONB,
    cover_note    TEXT,
    applied_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_application_job_candidate UNIQUE (job_id, candidate_id)
);
CREATE INDEX ix_applications_job ON applications(job_id);
CREATE INDEX ix_applications_candidate ON applications(candidate_id);
CREATE INDEX ix_applications_status ON applications(status);

CREATE TABLE application_status_history (
    id                  SERIAL PRIMARY KEY,
    application_id      INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    status              VARCHAR(20) NOT NULL,
    note                VARCHAR(500),
    changed_by_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_status_history_application ON application_status_history(application_id);

CREATE TABLE interviews (
    id                SERIAL PRIMARY KEY,
    application_id    INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    scheduled_at      TIMESTAMPTZ NOT NULL,
    mode              VARCHAR(20) NOT NULL,
    location_or_link  VARCHAR(500),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_interviews_application ON interviews(application_id);

CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(120) NOT NULL,
    message     VARCHAR(500) NOT NULL,
    link        VARCHAR(255),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_user_read ON notifications(user_id, is_read);

CREATE TABLE saved_jobs (
    job_id        INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id  INTEGER NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    saved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (job_id, candidate_id)
);

CREATE TABLE audit_logs (
    id             SERIAL PRIMARY KEY,
    actor_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action         VARCHAR(80) NOT NULL,
    target_type    VARCHAR(40) NOT NULL,
    target_id      INTEGER,
    details        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_action ON audit_logs(action);
CREATE INDEX ix_audit_created ON audit_logs(created_at);
