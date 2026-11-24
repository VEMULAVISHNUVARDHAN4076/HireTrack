# HireTrack – AI-Assisted Job Recruitment Management System

HireTrack is a full-stack recruitment platform with three roles (job seeker, recruiter, administrator), PDF/DOCX resume
upload and text extraction, explainable AI resume matching, job recommendations, application tracking, interviews,
notifications and an admin console.

- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Axios
- **Backend:** Python 3.12, Flask, Flask-JWT-Extended, SQLAlchemy, Flask-Limiter, Flask-Bcrypt
- **Database:** PostgreSQL (SQLite is used only by the automated tests)
- **AI:** taxonomy-based skill extraction, TF-IDF or Sentence Transformers semantic similarity, scikit-learn, PyMuPDF, python-docx

Full requirements are in [`documentation/SRS.md`](documentation/SRS.md). Deployment is in
[`documentation/deployment.md`](documentation/deployment.md). Test cases are in [`documentation/test_cases.md`](documentation/test_cases.md).

## Project layout

```
HireTrack/
  backend/     Flask API (app/models.py, app/routes/, app/services/, app/ai/, tests/)
  frontend/    React + Vite SPA (src/pages/, src/components/, src/services/api.js)
  database/    schema.sql (reference DDL)
  documentation/  SRS.md, deployment.md, test_cases.md
  render.yaml  Render Blueprint for one-click deployment
```

## Run locally

Prerequisites: Python 3.12+, Node.js 20+, PostgreSQL 14+ (or Docker).

### 1. Database

```bash
createdb hiretrack            # or create the database in pgAdmin
# optional: psql -d hiretrack -f database/schema.sql
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate              # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                   # then edit DATABASE_URL and secrets
export FLASK_APP=run.py                # Windows PowerShell: $env:FLASK_APP="run.py"
flask init-db                          # creates tables
flask create-admin                     # prompts for admin email, name and password
flask seed-demo                        # optional demo recruiter/candidate/jobs (DEMO_PASSWORD, default Demo12345)
python run.py                          # API on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env                   # leave VITE_API_BASE_URL empty for the dev proxy
npm run dev                            # http://localhost:5173
```

### 4. Tests

```bash
cd backend && pytest -q                # backend unit, integration and security tests
cd frontend && npm test                # component tests (Vitest + Testing Library)
```

## Default demo accounts (after `flask seed-demo`)

| Role | Email | Password |
|---|---|---|
| Recruiter (verified) | recruiter@demo.local | `DEMO_PASSWORD` or `Demo12345` |
| Candidate | candidate@demo.local | `DEMO_PASSWORD` or `Demo12345` |

Change these before any public deployment.

## Security notes

- Passwords are hashed with bcrypt. Administrator accounts cannot self-register; they are created with `flask create-admin`.
- Every protected endpoint checks the JWT and the user's role on the server. The frontend hides navigation only as a convenience.
- Resume uploads are checked for extension, size (5 MB) and file signature (magic bytes), and are downloaded only by the owning candidate, a recruiter who received that application, or an administrator.
- Login and registration are rate limited. Errors never expose stack traces.
- AI scores are estimates. The system never rejects or hires candidates automatically.

## Known limitations

See Section 16 of the SRS. The most important: free hosting tiers spin down and expire databases, the semantic model is optional
because of its size, and the recommendation engine computes matches per request, which suits this scale but not thousands of concurrent users.
