# HireTrack – Deployment Guide (free tier)

This guide deploys HireTrack to Render using the included `render.yaml`. The same steps work on any host that supports
Python web services, static sites and PostgreSQL.

## 0. Verify limits first

Free tiers change. Before deploying, check the current terms:

- Render free instances: https://render.com/docs/free

Behaviour that affects this project as of the last check:

| Limit | Impact on HireTrack | Mitigation |
|---|---|---|
| Free web service spins down after 15 min idle | First request after idle takes about a minute | Acceptable for an academic demo; mention it in the demo |
| Ephemeral filesystem | Files written to disk are lost on redeploy | Resumes are stored in PostgreSQL (`BYTEA`), not on disk |
| Free PostgreSQL expires 30 days after creation | Resumes and all data are deleted when it expires | Export with `pg_dump` before expiry, or move `DATABASE_URL` to another free or paid Postgres |
| Monthly instance hours (750) | One always-on service fits within the quota | None needed |

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "HireTrack initial release"
git branch -M main
git remote add origin https://github.com/<you>/hiretrack.git
git push -u origin main
```

The `.gitignore` excludes `.env` files and dependencies. Never commit secrets.

## 2. Create the Blueprint

1. In Render, choose **New → Blueprint** and select the repository.
2. Render reads `render.yaml` and proposes three resources: `hiretrack-api`, `hiretrack-web` and `hiretrack-db`.
3. Set the two prompted values:
   - `hiretrack-api` → `CORS_ORIGINS` = `https://<your-web-service>.onrender.com`
   - `hiretrack-web` → `VITE_API_BASE_URL` = `https://<your-api-service>.onrender.com/api`
4. Apply the Blueprint. `SECRET_KEY` and `JWT_SECRET_KEY` are generated automatically.

Because Vite embeds `VITE_API_BASE_URL` at build time, redeploy the frontend after changing it.

## 3. Initialise the database (once)

Open the API service's **Shell** in Render and run:

```bash
export FLASK_APP=run.py
flask init-db
flask create-admin
```

To load demo data for a presentation, run `flask seed-demo` as well. Remove the demo accounts before any real use.

## 4. Verify production

Run these checks after deployment and record the results in `documentation/test_cases.md`:

```bash
curl https://<api>/api/health                       # expect {"status":"ok"}
curl -X POST https://<api>/api/auth/register -H "Content-Type: application/json" \
  -d '{"role":"candidate","email":"t1@example.com","password":"Strong123","full_name":"Test User"}'
```

Then, in the browser: register, log in, upload a DOCX or PDF resume, apply to a job, view the match panel, and download the
resume. Confirm that a second candidate receives 404 for that resume's download URL.

## 5. Recruiter verification

New recruiter accounts cannot post jobs until an administrator verifies them. Log in as the admin, open **Users**, filter by
"Pending verification", and click **Verify**.

## 6. Local production check

```bash
cd backend
APP_ENV=production SECRET_KEY=... JWT_SECRET_KEY=... gunicorn "run:app" --bind 127.0.0.1:8000
```

The app refuses to start in production with the default development secrets.

## 7. Backups

```bash
pg_dump "$DATABASE_URL" > hiretrack-backup-$(date +%F).sql
```

Schedule this before the free database expires, or migrate to another Postgres provider and update `DATABASE_URL`.

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Browser CORS error | `CORS_ORIGINS` does not match the frontend URL exactly | Set it to the exact origin, including `https://`, and redeploy |
| Frontend calls `localhost` | `VITE_API_BASE_URL` was empty at build time | Set it and redeploy the static site |
| 500 on first API call | Tables not created | Run `flask init-db` in the API shell |
| Resume upload says no readable text | Scanned/image-only PDF | Upload a text-based PDF or DOCX (OCR is out of scope) |
| Match score always 0 | Resume too short or no shared vocabulary | Check the extracted text; add skills to the profile |
