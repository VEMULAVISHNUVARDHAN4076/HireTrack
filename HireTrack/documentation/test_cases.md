# HireTrack – Test Cases

**Result status legend:** `Pending` = not yet executed in the deployment environment; `Pass` / `Fail` = recorded after execution.
Automated tests are run with `cd backend && pytest -q` and `cd frontend && npm test`. Each automated test name is listed in the
"Automated" column so results can be matched.

| Test Case ID | Scenario | Preconditions | Test Steps | Expected Result | Actual Result | Status | Automated |
|---|---|---|---|---|---|---|---|
| TC-AUTH-01 | Candidate registers | No account with the email | POST /api/auth/register with role=candidate | 201, token and user returned | | Pending | test_auth::test_candidate_registers_and_receives_token |
| TC-AUTH-02 | Admin self-registration blocked | None | POST register with role=admin | 400 | | Pending | test_auth::test_admin_cannot_self_register |
| TC-AUTH-03 | Weak password rejected | None | Register with "short" | 400 | | Pending | test_auth::test_weak_password_rejected |
| TC-AUTH-04 | Duplicate email rejected | Existing account | Register same email in other case | 409 | | Pending | test_auth::test_duplicate_email_rejected |
| TC-AUTH-05 | Generic login error | Existing account | Login with wrong password | 401, "Invalid email or password." | | Pending | test_auth::test_wrong_password_returns_generic_error |
| TC-AUTH-06 | Suspended user blocked | Active user logged in | Suspend, then call /auth/me and login | 403 on both | | Pending | test_auth::test_suspended_user_cannot_log_in_or_use_token |
| TC-AUTH-07 | Protected route without token | None | GET /api/auth/me without header | 401 | | Pending | test_auth::test_protected_route_requires_token |
| TC-AUTH-08 | Change password | Logged in | Change with correct current password, then log in with new one | 200, login succeeds | | Pending | test_auth::test_change_password |
| TC-AUTH-09 | Login route rate limit | Rate limiting enabled (production) | Send 21 login requests in 15 minutes | 429 after limit | | Pending | Manual |
| TC-PROF-01 | Candidate profile save | Logged in candidate | PUT profile with headline, skills, education | 200, values persisted on GET | | Pending | Manual / UI |
| TC-PROF-02 | Skill normalisation | Logged in candidate | PUT skills ["Python ", "PYTHON", "SQL"] | Stored as python, sql | | Pending | Manual |
| TC-PROF-03 | Recruiter website validation | Logged in recruiter | PUT website "example.com" | 400 | | Pending | Manual |
| TC-RES-01 | Upload valid DOCX | Candidate | Upload a DOCX with text | 201, text extracted | | Pending | test_workflow::test_full_application_lifecycle |
| TC-RES-02 | Upload valid PDF | Candidate | Upload a text PDF | 201 | | Pending | test_resume_service::test_pdf_text_extraction |
| TC-RES-03 | Reject wrong extension | Candidate | Upload evil.exe | 415 | | Pending | test_resume_service::test_rejects_disallowed_extension |
| TC-RES-04 | Reject spoofed PDF | Candidate | Upload HTML renamed .pdf | 415 | | Pending | test_resume_service::test_rejects_pdf_extension_with_wrong_content |
| TC-RES-05 | Reject oversize file | Candidate | Upload file over 5 MB | 413 | | Pending | test_resume_service::test_rejects_oversized_file |
| TC-RES-06 | Filename sanitised | None | Upload "../../cv.pdf" | Safe name without path | | Pending | test_resume_service::test_sanitises_path_in_filename |
| TC-RES-07 | Resume delete in use | Resume referenced by application | DELETE resume | Soft deleted; application still shows resume | | Pending | Manual |
| TC-RES-08 | Other candidate cannot download | Two candidates | Candidate B downloads A's resume | 404 | | Pending | test_security::test_candidate_cannot_see_another_candidates_resume |
| TC-JOB-01 | Unverified recruiter cannot post | Recruiter not verified | POST /api/jobs | 403 | | Pending | test_workflow::test_unverified_recruiter_cannot_post_jobs |
| TC-JOB-02 | Verified recruiter posts job | Verified recruiter | POST valid job | 201 | | Pending | test_workflow::test_full_application_lifecycle |
| TC-JOB-03 | Recruiter edits another's job | Two recruiters | PUT job owned by other | 404 | | Pending | test_security::test_recruiter_cannot_edit_another_recruiters_job |
| TC-JOB-04 | Closed job hidden | Open job | Close job, then list and GET as candidate | Not listed; 404 for candidate | | Pending | test_workflow::test_closed_jobs_are_hidden_and_not_applicable |
| TC-JOB-05 | Delete job with applications blocked | Job with application | DELETE job | 409 | | Pending | test_workflow::test_job_with_applications_cannot_be_deleted |
| TC-JOB-06 | Past deadline rejected | Verified recruiter | Create job with yesterday's deadline | 400 | | Pending | Manual |
| TC-SRCH-01 | Keyword and skill filter | Seeded jobs | GET /api/jobs?q=python&skill=flask | Only matching jobs | | Pending | test_workflow (filter assertions) |
| TC-SRCH-02 | Pagination metadata | 12+ jobs | GET ?per_page=5&page=2 | Page 2, total correct | | Pending | Manual |
| TC-SRCH-03 | SQL metacharacters safe | None | Search with `' OR 1=1 --` | 200, no error | | Pending | test_security::test_sql_metacharacters_in_search_are_safe |
| TC-SRCH-04 | Save and unsave job | Candidate | Save then unsave | Appears and disappears in saved list | | Pending | Manual |
| TC-APP-01 | Apply with resume | Open job, resume | POST apply | 201 with match score | | Pending | test_workflow::test_full_application_lifecycle |
| TC-APP-02 | Duplicate application blocked | Already applied | Apply again | 409 | | Pending | test_workflow::test_full_application_lifecycle |
| TC-APP-03 | Illegal status transition | Shortlisted | Set status applied | 409 | | Pending | test_workflow::test_full_application_lifecycle |
| TC-APP-04 | Shortlist with note | Applied | PATCH status shortlisted | 200, history entry, candidate notified | | Pending | test_workflow::test_full_application_lifecycle |
| TC-APP-05 | Withdraw | Shortlisted | POST withdraw | 200, status withdrawn | | Pending | test_workflow::test_full_application_lifecycle |
| TC-APP-06 | Notifications created | Apply and status change | Read notifications | Entries created, unread count shown | | Pending | test_workflow::test_notifications_created_on_apply_and_status_change |
| TC-APP-07 | Schedule interview | Under review | POST interview | 201, status interview | | Pending | Manual |
| TC-APP-08 | Recruiter cannot view other's applicants | Two recruiters | GET applicants of other job | 404 | | Pending | Manual |
| TC-AI-01 | Keyword detection whole-word | None | Extract skills from "javascript" | Only javascript | | Pending | test_matcher::test_taxonomy_matches_whole_words_only |
| TC-AI-02 | Coverage, missing and matched | Rich resume | Compute match | Correct matched and missing lists | | Pending | test_matcher::test_skill_coverage_and_missing_when_resume_is_rich |
| TC-AI-03 | Thin resume gives unconfirmed | Short resume | Compute match | Unconfirmed, not missing | | Pending | test_matcher::test_thin_resume_marks_skills_unconfirmed_not_missing |
| TC-AI-04 | Empty resume scores 0 | None | Compute match | Score 0 | | Pending | test_matcher::test_empty_resume_scores_zero |
| TC-AI-05 | Determinism | None | Compute twice | Identical output | | Pending | test_matcher::test_scores_are_deterministic |
| TC-AI-06 | Recommendations exclude closed jobs | Candidate with resume | Close a matching job | Job absent from recommendations | | Pending | test_workflow::test_recommendations_exclude_closed_jobs |
| TC-NOT-01 | Unread filter and mark read | Notifications exist | Mark read, filter unread | Counts update | | Pending | Manual |
| TC-NOT-02 | Mark all read | Multiple unread | POST read-all | Unread count 0 | | Pending | Manual |
| TC-ADM-01 | Stats visible to admin | Admin | GET /api/admin/stats | Counts returned | | Pending | Manual |
| TC-ADM-02 | Verify recruiter | Pending recruiter | PATCH is_verified true | 200, job posting now allowed | | Pending | test_security::test_admin_can_verify_recruiter_and_suspend_user |
| TC-ADM-03 | Suspend user | Active candidate | PATCH is_active false | 200 and login blocked | | Pending | test_security::test_admin_can_verify_recruiter_and_suspend_user |
| TC-ADM-04 | Remove job with reason | Open job | PATCH remove with reason | Status removed, recruiter notified | | Pending | Manual |
| TC-ADM-05 | Admin route forbidden to candidate | Candidate | GET /api/admin/stats | 403 | | Pending | test_security::test_candidate_cannot_access_admin_routes |
| TC-ADM-06 | CSV export excludes contacts | Applications exist | GET /admin/reports/applications?format=csv | CSV without email columns | | Pending | Manual |
| TC-SEC-01 | Security headers | None | GET /api/health | nosniff, frame deny | | Pending | test_security::test_security_headers_present |
| TC-SEC-02 | No stack trace leakage | None | GET missing job | 404 without traceback | | Pending | test_security::test_error_responses_do_not_leak_stack_traces |
| TC-SEC-03 | Production refuses dev secrets | APP_ENV=production, default secrets | Start app | RuntimeError | | Pending | Manual |
| TC-SEC-04 | Secrets not in repository | None | git grep for secret values | No matches | | Pending | Manual |
| TC-UI-01 | Responsive layout | Browser | View at 360, 768, 1280 px | No horizontal page scroll; navigation usable | | Pending | Manual |
| TC-UI-02 | Keyboard operation | Browser | Tab through login and apply forms | Visible focus; all controls reachable | | Pending | Manual |
| TC-UI-03 | Frontend component tests | None | npm test | Pass | | Pending | components.test.jsx |
| TC-E2E-01 | Full workflow in deployment | Deployed stack | Register recruiter → admin verifies → post job → candidate applies → match → shortlist → interview → withdraw another | Each step succeeds | | Pending | Manual |
| TC-E2E-02 | Resume upload and download in deployment | Deployed stack | Upload DOCX and PDF, download both | Files identical to uploads | | Pending | Manual |
| TC-E2E-03 | AI matching in deployment | Deployed stack | Apply to a job, view match | Score and lists shown with disclaimer | | Pending | Manual |
