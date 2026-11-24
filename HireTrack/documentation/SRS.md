# Software Requirements Specification (SRS)
## HireTrack – AI-Assisted Job Recruitment Management System

| Item | Value |
|---|---|
| Version | 1.0 |
| Standard followed | IEEE 830-1998 structure (adapted) |
| Course | Software Engineering and System Designing |
| Project type | Individual academic project |
| Status | Baseline for the delivered implementation |

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for HireTrack, a web application that connects job seekers and recruiters, supports
application tracking, and assists recruiters and candidates with explainable AI resume matching. It is the reference for
implementation, testing and acceptance.

### 1.2 Intended audience
Course evaluators, the developer, and anyone maintaining or deploying the system.

### 1.3 Project scope
In scope:
- Registration and login for candidates and recruiters; administrator accounts created by the operator only.
- Candidate profiles (education, experience, skills), resume upload (PDF/DOCX), replacement and deletion.
- Recruiter company profiles, job posting lifecycle (create, edit, close, reopen, delete when unused).
- Public job search and filtering, job detail pages, saved jobs.
- Applications with duplicate prevention, status lifecycle with history, withdrawal, interviews.
- AI resume-to-job matching and job recommendations, with explanations.
- In-app notifications.
- Administrator dashboard: statistics, user verification and suspension, job moderation, audit log, reports.

Out of scope: payments, e-mail/SMS delivery, OCR of scanned resumes, video interviews, multi-language UI, native mobile apps,
and automated hiring decisions.

### 1.4 Definitions and abbreviations

| Term | Meaning |
|---|---|
| Candidate | Job seeker account |
| Recruiter | Employer account that posts jobs; must be verified before posting |
| Administrator | Platform operator account |
| Application | A candidate's submission to one job, referencing one resume |
| Match score | Estimated 0–100 suitability of a resume for a job; advisory only |
| Skill coverage | Share of a job's required skills found in the candidate's resume or profile |
| Semantic similarity | Text similarity between resume and job description |
| JWT | JSON Web Token used for stateless authentication |
| SRS | Software Requirements Specification |
| SRS ID | Unique identifier of a requirement (e.g. FR-APP-03) |

### 1.5 References
- IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.
- WCAG 2.1 Level AA (accessibility target).
- OWASP Application Security Verification Standard (security checks in Section 12).

### 1.6 Overview
Section 2 describes the system context. Sections 3–5 describe users and environment. Sections 6–7 state functional and
non-functional requirements. Sections 8–9 cover interfaces, data and security. Sections 10–12 cover constraints, assumptions
and acceptance. Sections 13–17 cover traceability, the matching method, and the glossary.

---

## 2. Overall description

### 2.1 Product perspective
HireTrack is a self-contained three-tier system: a React single-page application, a Flask REST API with an AI service
layer, and a PostgreSQL database. It is deployed as a separate static site and API service (see `deployment.md`).

### 2.2 Product functions (summary)
1. Account management and authentication.
2. Candidate profile and resume management.
3. Job publishing and moderation.
4. Job search and discovery.
5. Application submission and tracking.
6. Recruiter applicant management.
7. AI resume matching and job recommendations.
8. Notifications.
9. Administration and reporting.

### 2.3 User characteristics

| User | Technical skill | Frequency | Primary goal |
|---|---|---|---|
| Candidate | Basic web use; may be on a phone | Several times a week | Find and track jobs |
| Recruiter | Basic to intermediate | Daily during hiring | Find, review and progress candidates |
| Administrator | Intermediate | Occasional | Keep accounts and listings legitimate |

### 2.4 Operating environment
- Browsers: current Chrome, Edge, Firefox and Safari; mobile Chrome and Safari.
- Server: Python 3.12, Flask 3, gunicorn; PostgreSQL 14 or later.
- Frontend build: Node.js 20 or later, Vite 5.
- Hosting: any platform supporting Python web services, static sites and PostgreSQL (see deployment guide).

### 2.5 Design and implementation constraints
- Stack fixed to the approved list: React, Vite, Tailwind, React Router, Axios; Flask, Flask-JWT-Extended, SQLAlchemy;
  PostgreSQL; scikit-learn, PyMuPDF, python-docx, Sentence Transformers (optional); pytest; React Testing Library.
- All components must be free and open source.
- Resumes are stored in the database, because free hosts do not keep files on disk across redeploys.
- Semantic embedding models are optional, because their size exceeds typical free-tier memory limits.

### 2.6 Assumptions and dependencies
- Candidates upload text-based PDFs or DOCX files. Scanned documents are rejected with a clear message.
- Recruiters are honest about company identity; administrators verify them manually.
- The database and API are reachable over HTTPS in production.

---

## 3. External interface requirements

### 3.1 User interfaces
- Responsive layout: single-column below 768 px, sidebar navigation at 768 px and above.
- Consistent components: cards, tables, forms with inline validation, status badges, score bars, empty states, loading
  indicators, error and success alerts, confirmation prompts before destructive actions.
- Keyboard-operable controls with visible focus states; form controls have associated labels.

### 3.2 Hardware interfaces
None beyond standard client devices.

### 3.3 Software interfaces
- REST/JSON API under `/api`, JSON responses in the envelope `{"data": ..., "meta": ...}` and errors in
  `{"error": {"message": ..., "status": ...}}`.
- Bearer token in the `Authorization` header.
- Multipart upload for resumes (`file` field).
- File download returned as `application/octet-stream` attachments with the original file type.

### 3.4 Communications interfaces
HTTPS in production (HSTS header sent). Development uses HTTP on localhost via the Vite proxy.

---

## 4. Functional requirements

Priority: **M** Must, **S** Should, **C** Could.

### 4.1 Authentication (FR-AUTH)

| ID | Requirement | Pri |
|---|---|---|
| FR-AUTH-01 | The system shall let a visitor register as a candidate or recruiter with email, password, full name (and company name for recruiters). | M |
| FR-AUTH-02 | The system shall reject registration as administrator. | M |
| FR-AUTH-03 | The system shall reject duplicate email addresses, case-insensitively. | M |
| FR-AUTH-04 | The system shall enforce password rules: 8–72 characters, at least one letter and one digit. | M |
| FR-AUTH-05 | The system shall authenticate with email and password and issue a signed JWT with a configurable expiry (default 60 minutes). | M |
| FR-AUTH-06 | The system shall show the same generic error for unknown email and wrong password. | M |
| FR-AUTH-07 | The system shall let a logged-in user change their password after confirming the current one. | M |
| FR-AUTH-08 | The system shall block login and all API access for suspended accounts. | M |
| FR-AUTH-09 | The system shall limit login and registration attempts per client address. | M |
| FR-AUTH-10 | The system shall provide an administrator-only command to create the first and any further administrator. | M |
| FR-AUTH-11 | The system shall let the user log out by discarding the session token. | M |
| FR-AUTH-12 | The system shall redirect unauthenticated users to the login page when they open a protected page. | M |

### 4.2 Profiles (FR-PROF)

| ID | Requirement | Pri |
|---|---|---|
| FR-PROF-01 | A candidate shall be able to edit headline, location, phone, summary and years of experience. | M |
| FR-PROF-02 | A candidate shall be able to add, edit and remove education entries (institution, degree, field, years). | M |
| FR-PROF-03 | A candidate shall be able to add, edit and remove work experience entries, including a current-role flag. | M |
| FR-PROF-04 | A candidate shall be able to set up to 50 skills; skills are normalised to lower case and de-duplicated. | M |
| FR-PROF-05 | A recruiter shall be able to edit the company profile (name, website, industry, location, description). | M |
| FR-PROF-06 | Website values shall start with http:// or https://. | M |

### 4.3 Resumes (FR-RES)

| ID | Requirement | Pri |
|---|---|---|
| FR-RES-01 | A candidate shall be able to upload a PDF or DOCX resume of at most 5 MB. | M |
| FR-RES-02 | The system shall verify the file signature (magic bytes) and reject files whose content does not match their extension. | M |
| FR-RES-03 | The system shall extract plain text from the file, clean it and store it with the resume. | M |
| FR-RES-04 | The system shall reject password-protected PDFs, PDFs over 50 pages, and files with no extractable text, with a specific message. | M |
| FR-RES-05 | A candidate shall be able to hold up to five active resumes. | S |
| FR-RES-06 | A candidate shall be able to replace a resume by uploading a new one and deleting the old one. | M |
| FR-RES-07 | Deleting a resume that is referenced by an application shall keep the file for that application (soft delete). | M |
| FR-RES-08 | A candidate shall be able to download their own resumes. | M |
| FR-RES-09 | A recruiter shall be able to download a resume only if a candidate applied to one of the recruiter's jobs with it. | M |
| FR-RES-10 | An administrator shall be able to download any resume. | S |
| FR-RES-11 | Any other user requesting a resume shall receive "not found" (no existence disclosure). | M |

### 4.4 Job management (FR-JOB)

| ID | Requirement | Pri |
|---|---|---|
| FR-JOB-01 | A verified recruiter shall be able to create a job with title, description, location, employment type, minimum experience, optional salary range, optional deadline and skills. | M |
| FR-JOB-02 | Unverified recruiters shall not be able to create jobs. | M |
| FR-JOB-03 | A recruiter shall be able to edit their own jobs. | M |
| FR-JOB-04 | A recruiter shall be able to close and reopen their own jobs. A job cannot be reopened after its deadline passes. | M |
| FR-JOB-05 | A recruiter shall be able to delete their own job only if it has no applications. | M |
| FR-JOB-06 | Deadlines shall not be in the past. | M |
| FR-JOB-07 | Only jobs that are open and not past deadline shall appear in public search and recommendations. | M |
| FR-JOB-08 | The system shall show the recruiter's jobs with applicant counts and status filters. | M |
| FR-JOB-09 | An administrator shall be able to remove a job with a stated reason; the recruiter shall be notified. | M |
| FR-JOB-10 | An administrator shall be able to restore a removed job as closed. | S |

### 4.5 Job search and discovery (FR-SRCH)

| ID | Requirement | Pri |
|---|---|---|
| FR-SRCH-01 | Visitors shall search jobs by keyword across title, description and company name. | M |
| FR-SRCH-02 | Visitors shall filter jobs by location, employment type and skill. | M |
| FR-SRCH-03 | Visitors shall sort results by newest, closing soon, title, or minimum experience. | M |
| FR-SRCH-04 | Results shall be paginated (default 10, maximum 50 per page) with total count. | M |
| FR-SRCH-05 | Filter and page state shall be reflected in the URL so results can be shared or reloaded. | S |
| FR-SRCH-06 | A candidate shall be able to save and unsave open jobs and view saved jobs. | M |
| FR-SRCH-07 | The job detail page shall show whether the candidate has already applied or saved the job. | M |

### 4.6 Applications (FR-APP)

| ID | Requirement | Pri |
|---|---|---|
| FR-APP-01 | A candidate shall apply to an open job by selecting one of their active resumes and optionally adding a cover note (max 2000 characters). | M |
| FR-APP-02 | The system shall prevent more than one application per candidate per job, including under concurrent requests. | M |
| FR-APP-03 | Each application shall store a reference to the resume used and a snapshot of its match result at submission. | M |
| FR-APP-04 | The status lifecycle shall be: applied, under review, shortlisted, interview, offered, rejected, withdrawn. Terminal statuses are offered, rejected and withdrawn. | M |
| FR-APP-05 | Only the transitions in Table 4.6-A shall be allowed. Other transitions shall be refused with a conflict error. | M |
| FR-APP-06 | Every status change shall be recorded with time, actor and optional note. | M |
| FR-APP-07 | A candidate shall be able to withdraw an application that is not in a terminal status. | M |
| FR-APP-08 | A recruiter shall be able to view applicants for their job, filter by status, search by name, and sort by match score or date. | M |
| FR-APP-09 | A recruiter shall be able to schedule an interview (date, time, mode, location or link, notes). Scheduling moves the application to interview stage when the transition is allowed. | M |
| FR-APP-10 | A candidate shall be able to view their applications, filter by status, and view the full history and interviews. | M |
| FR-APP-11 | Each status change and interview shall create a notification for the candidate. | M |

**Table 4.6-A – Allowed status transitions**

| From | To |
|---|---|
| applied | under_review, shortlisted, rejected, withdrawn |
| under_review | shortlisted, interview, rejected, withdrawn |
| shortlisted | interview, offered, rejected, withdrawn |
| interview | shortlisted, offered, rejected, withdrawn |
| offered, rejected, withdrawn | none |

Recruiters cannot set `withdrawn`; only candidates withdraw.

### 4.7 AI matching and recommendations (FR-AI)

| ID | Requirement | Pri |
|---|---|---|
| FR-AI-01 | The system shall compute a 0–100 match score between a candidate's resume (plus declared skills) and a job. | M |
| FR-AI-02 | The score shall combine skill coverage and semantic similarity using configurable weights (default 0.6 and 0.4). | M |
| FR-AI-03 | The result shall list matched skills, skills not found in the resume, and skills unconfirmed because the resume text is too limited to judge. | M |
| FR-AI-04 | The result shall include the component scores, the method used, and a disclaimer that the score is an estimate and not a hiring decision. | M |
| FR-AI-05 | Semantic similarity shall use Sentence Transformers when enabled and installed, and otherwise TF-IDF cosine similarity. A failure of the preferred method shall fall back without error to the user. | M |
| FR-AI-06 | A recruiter or the candidate concerned shall be able to view the match for an application; the view recalculates against current job data. | M |
| FR-AI-07 | A candidate shall receive ranked job recommendations from open, unexpired jobs, each with a plain-language reason and matched, missing and unconfirmed skills. | M |
| FR-AI-08 | Recommendations shall reflect the latest profile and job data on each request, and shall indicate jobs the candidate has already applied to. | M |
| FR-AI-09 | When a candidate has neither a resume nor skills, the system shall return no recommendations and a message explaining what to add. | M |
| FR-AI-10 | The system shall never reject, shortlist or hire a candidate automatically based on a score. | M |

### 4.8 Notifications (FR-NOT)

| ID | Requirement | Pri |
|---|---|---|
| FR-NOT-01 | Users shall receive in-app notifications for: new application (recruiter), status change and interview scheduled (candidate), job removed and account verified (recruiter). | M |
| FR-NOT-02 | Users shall list notifications, filter unread, mark one or all as read, and see an unread count. | M |
| FR-NOT-03 | A notification shall link to the relevant page when applicable. | S |

### 4.9 Administration (FR-ADM)

| ID | Requirement | Pri |
|---|---|---|
| FR-ADM-01 | The administrator shall see totals for candidates, recruiters, pending verifications, suspended accounts, jobs by status, and applications by status. | M |
| FR-ADM-02 | The administrator shall search and filter users by role, state (pending or suspended) and name or email. | M |
| FR-ADM-03 | The administrator shall verify recruiter accounts. | M |
| FR-ADM-04 | The administrator shall suspend and reactivate candidate and recruiter accounts. Administrator accounts cannot be modified through the interface. | M |
| FR-ADM-05 | The administrator shall search, filter and remove job listings, and restore removed listings. | M |
| FR-ADM-06 | Every administrative action shall be recorded in an audit log with actor, action, target and time. | M |
| FR-ADM-07 | The administrator shall view the audit log, paginated. | M |
| FR-ADM-08 | The administrator shall view an application report in summary form and export it as CSV without candidate contact details. | S |

---

## 5. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-PERF-01 | Performance | Typical API responses for list and detail endpoints shall complete in under 500 ms at 1,000 jobs and 5,000 applications on the reference database, excluding cold starts. |
| NFR-PERF-02 | Performance | Resume text extraction for a 5 MB, 50-page PDF shall complete within 10 seconds. |
| NFR-PERF-03 | Performance | Job recommendations for a candidate shall complete within 3 seconds when at most 500 open jobs exist with the TF-IDF method. |
| NFR-SEC-01 | Security | Passwords shall be stored only as bcrypt hashes. |
| NFR-SEC-02 | Security | Every protected endpoint shall enforce authentication and role checks on the server. |
| NFR-SEC-03 | Security | The system shall prevent SQL injection by using parameterised queries through SQLAlchemy only. |
| NFR-SEC-04 | Security | Output shall be JSON-encoded, and the frontend shall render user content as text, not HTML, preventing XSS. |
| NFR-SEC-05 | Security | Uploads shall be validated for type, size and signature, and stored with a sanitised file name. |
| NFR-SEC-06 | Security | The API shall send `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and HSTS in production. |
| NFR-SEC-07 | Security | Secrets shall come from environment variables. The production start-up shall fail if default development secrets are used. |
| NFR-SEC-08 | Security | Login and registration shall be rate limited per client address. |
| NFR-SEC-09 | Security | Error responses shall not include stack traces or internal details. |
| NFR-SEC-10 | Security | CORS shall allow only origins listed in configuration. |
| NFR-USE-01 | Usability | Each role shall reach its primary task within three clicks from the dashboard. |
| NFR-USE-02 | Usability | Forms shall validate inputs before submission and show messages next to the relevant field. |
| NFR-USE-03 | Usability | Destructive actions (delete, withdraw, suspend, remove) shall require confirmation. |
| NFR-USE-04 | Usability | Score displays shall always be accompanied by the explanation and the disclaimer. |
| NFR-REL-01 | Reliability | A failed multi-step write shall be rolled back, leaving no partial application, notification or history. |
| NFR-REL-02 | Reliability | Unexpected server errors shall return a generic 500 response and be logged server-side. |
| NFR-REL-03 | Reliability | The AI method shall degrade to the lighter method on failure without failing the request. |
| NFR-MNT-01 | Maintainability | Backend code shall be organised into routes, services, models, AI and utilities, with no database access in the AI package. |
| NFR-MNT-02 | Maintainability | Business rules (transitions, visibility, access) shall be implemented in one place each. |
| NFR-MNT-03 | Maintainability | Automated tests shall cover authentication, workflow, matching, upload validation and access control. |
| NFR-SCL-01 | Scalability | The API shall be stateless (JWT), so additional gunicorn workers or instances can be added behind a load balancer. The in-memory rate-limit store must be replaced with a shared store for multi-instance deployment. |
| NFR-CMP-01 | Compatibility | The UI shall work on viewport widths from 360 px to 1920 px. |
| NFR-CMP-02 | Compatibility | The system shall run on PostgreSQL 14+. |
| NFR-ACC-01 | Accessibility | The UI shall meet WCAG 2.1 AA for colour contrast, labels, focus visibility and keyboard operation for the primary flows. |
| NFR-ACC-02 | Accessibility | Status and feedback messages shall use appropriate ARIA roles (alert or status). |

---

## 6. Database requirements

Entities (see `database/schema.sql` and `backend/app/models.py`):

| Entity | Key relationships |
|---|---|
| users | 1 to 0..1 candidate_profiles; 1 to 0..1 recruiter_profiles; 1 to many notifications |
| candidate_profiles | 1 to many education, experience, resumes, applications, saved_jobs; many to many skills |
| recruiter_profiles | 1 to many jobs |
| jobs | many to many skills; 1 to many applications |
| resumes | belongs to one candidate; referenced by applications |
| applications | unique (job_id, candidate_id); 1 to many status history and interviews |
| notifications | belongs to one user |
| saved_jobs | composite key (job_id, candidate_id) |
| audit_logs | optional actor |

Constraints: primary keys on all tables; foreign keys with cascade rules as in the schema; check constraints on role, status
and employment type; unique email; unique (job, candidate) on applications; indexes on foreign keys, status, location,
employment type, and notification (user, read flag).

Data retention: deleting a job that has applications is refused. Soft-deleted resumes remain for application history.

---

## 7. Security requirements

Summary of controls mapped to the OWASP ASVS categories used in testing:

| Area | Control |
|---|---|
| Authentication | bcrypt hashing; JWT with expiry; rate limiting; generic login errors; suspension check on every request |
| Authorisation | server-side role decorator; ownership checks on jobs, applications and resumes; 404 for foreign objects |
| Input validation | type, length and range checks; enumerated values; ISO date parsing; list size limits |
| File upload | extension allow-list; size limit; magic-byte check; sanitised names; page and encryption checks |
| Injection | ORM parameter binding only; no string-built SQL |
| Output | JSON responses; React escaping; no HTML from user content |
| Transport | HTTPS in production; HSTS; CORS allow-list |
| Headers | nosniff, frame deny, no-referrer, no-store on JSON |
| Secrets | environment variables; `.env` excluded from source control; production start check |
| Logging | server-side exception logs; no sensitive values logged |
| Audit | administrative actions recorded |

---

## 8. System constraints
- Free hosting tiers: instances sleep after inactivity, databases may expire, filesystems are ephemeral (Section 15).
- Semantic model size: optional; default deployment uses TF-IDF.
- Text-only extraction: no OCR.

---

## 9. Assumptions and dependencies
- Users have modern browsers with JavaScript enabled.
- Resume content is in English or another language supported by the chosen models; the taxonomy is English.
- Operators run `flask init-db` and `flask create-admin` before first use.

---

## 10. Acceptance criteria

The system is accepted when:

1. All Must requirements in Section 4 are implemented and verified by the test cases in `test_cases.md`.
2. The automated backend and frontend suites pass.
3. A complete workflow passes end to end in the deployed environment: register recruiter, administrator verifies, recruiter posts job, candidate registers, uploads resume, applies, views match, recruiter shortlists and schedules an interview, candidate withdraws another application.
4. Cross-account access tests return 404 for resumes, applications and jobs belonging to others.
5. No secrets are present in the repository.

---

## 11. Use cases (summary)

| Actor | Use case |
|---|---|
| Visitor | Browse and filter jobs; view job detail; register |
| Candidate | Manage profile; manage resumes; apply; track applications; withdraw; save jobs; view recommendations; read notifications |
| Recruiter | Manage company profile; post, edit, close, reopen, delete jobs; review applicants; match view; update status; schedule interviews |
| Administrator | View statistics; verify and suspend accounts; moderate jobs; read audit log; export reports |
| All users | Change password; log out |

---

## 12. Test requirements (traceability)

Every requirement maps to at least one test in `documentation/test_cases.md`. Automated coverage is in `backend/tests/`
(pytest) and `frontend/src/__tests__/` (Vitest). Manual end-to-end and responsive checks are listed in the test case document.

---

## 13. Requirements traceability (summary)

| Area | Requirement IDs | Test IDs |
|---|---|---|
| Authentication | FR-AUTH-01..12 | TC-AUTH-01..08 |
| Profiles | FR-PROF-01..06 | TC-PROF-01..03 |
| Resumes | FR-RES-01..11 | TC-RES-01..08 |
| Jobs | FR-JOB-01..10 | TC-JOB-01..06 |
| Search | FR-SRCH-01..07 | TC-SRCH-01..04 |
| Applications | FR-APP-01..11 | TC-APP-01..08 |
| AI | FR-AI-01..10 | TC-AI-01..06 |
| Notifications | FR-NOT-01..03 | TC-NOT-01..02 |
| Administration | FR-ADM-01..08 | TC-ADM-01..06 |
| Security | NFR-SEC-01..10 | TC-SEC-01..08 |

---

## 14. Use of AI in the system (explanation for evaluators)

### 14.1 Skill extraction
A curated taxonomy of about 70 skills, with surface variants (for example "postgres" for PostgreSQL), is matched on whole
words and phrases in lower-cased text. "java" does not match "javascript". The taxonomy is in `backend/app/ai/taxonomy.py`
and can be extended by editing the file.

### 14.2 Scoring
- Skill coverage = matched required skills ÷ required skills (or the job's description-derived skills if none are listed).
- Semantic similarity = cosine similarity between the resume text and the job title plus description.
- Final score = (0.6 × coverage + 0.4 × similarity) ÷ (0.6 + 0.4), scaled to 0–100. If a job has no required skills, the
  similarity alone is used. Weights are read from configuration.

### 14.3 Missing versus unconfirmed
A skill absent from the text is reported as "not found" only if the resume contains at least 40 words of readable text. Below
that, the skill is "unconfirmed", because a thin or badly extracted document cannot prove absence.

### 14.4 Limitations
- Taxonomy matching cannot recognise synonyms it does not list or skills expressed only in prose.
- TF-IDF similarity rewards shared vocabulary, not meaning. Sentence Transformers improve this but require a model download.
- Scores are sensitive to resume length and formatting.
- Results are estimates for triage. They should not be the sole basis for any decision, and are not validated against hiring outcomes.
- Recommendations are computed on request; this is simple and always current, but it does not scale to very large job catalogues without caching.

### 14.5 Validation
The matching logic has unit tests for skill detection (whole-word behaviour), coverage and missing/unconfirmed separation,
determinism, and empty-input handling (`backend/tests/test_matcher.py`).

---

## 15. Known risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Free database expires (30 days per Render docs) | Data loss | Documented backup routine; alternative Postgres provider; verify terms before each deployment |
| Free web service sleeps | Slow first load | Note in demo; optional keep-alive monitor (external, free) |
| Ephemeral filesystem | Lost files | Resumes stored in database |
| Large semantic model exceeds memory | Failed start | Disabled by default; TF-IDF fallback |
| Rate limit counters reset on restart | Weaker throttling | Acceptable for single instance; use shared store for scale |
| Fake or inflated resumes | Misleading scores | Scores are advisory; recruiter review required |

---

## 16. Known limitations
- No OCR for scanned resumes.
- No e-mail notifications; in-app only.
- No password reset by e-mail (administrator can help via account management; reset flow is future work).
- No refresh tokens; sessions end when the token expires.
- Single-region deployment; no caching layer.

---

## 17. Glossary of statuses

| Code | Label shown to users | Meaning |
|---|---|---|
| applied | Applied | Submitted, not yet reviewed |
| under_review | Under review | Recruiter has opened the application |
| shortlisted | Shortlisted | Recruiter wants to progress the candidate |
| interview | Interview | An interview is scheduled or in progress |
| offered | Offered | Recruiter has made an offer |
| rejected | Rejected | Recruiter declined the application |
| withdrawn | Withdrawn | Candidate withdrew |
