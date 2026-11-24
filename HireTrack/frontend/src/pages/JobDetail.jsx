import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { candidateApi, errorMessage, jobsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Alert, Chip, Field, Spinner } from '../components/ui';
import { EMPLOYMENT_LABELS, formatDate } from '../utils/format';

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applying, setApplying] = useState(false);
  const [showApply, setShowApply] = useState(false);

  const isCandidate = user?.role === 'candidate';

  const load = () => jobsApi.get(id).then(setJob).catch((err) => setError(errorMessage(err, 'Job not found.')));

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  useEffect(() => {
    if (!isCandidate) return;
    candidateApi.resumes().then((list) => {
      setResumes(list);
      if (list[0]) setResumeId(String(list[0].id));
    }).catch(() => {});
  }, [isCandidate]);

  const toggleSave = async () => {
    try {
      if (job.is_saved) await jobsApi.unsave(job.id);
      else await jobsApi.save(job.id);
      setMessage(job.is_saved ? 'Removed from saved jobs.' : 'Job saved.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    setApplyError('');
    if (!resumeId) {
      setApplyError('Upload a resume before applying.');
      return;
    }
    setApplying(true);
    try {
      const application = await candidateApi.apply(job.id, { resume_id: Number(resumeId), cover_note: coverNote || null });
      navigate(`/applications/${application.id}`, { state: { justApplied: true } });
    } catch (err) {
      setApplyError(errorMessage(err));
    } finally {
      setApplying(false);
    }
  };

  if (error && !job) return <Alert>{error}</Alert>;
  if (!job) return <Spinner label="Loading job" />;

  return (
    <article className="space-y-6">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{job.title}</h1>
            <p className="text-slate-600">{job.company_name} · {job.location}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-sm">{EMPLOYMENT_LABELS[job.employment_type]}</span>
            {job.status !== 'open' && <span className="rounded-md bg-red-100 px-2 py-1 text-sm text-red-800">{job.status}</span>}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-slate-500">Minimum experience</dt><dd>{job.experience_min} years</dd></div>
          <div><dt className="text-slate-500">Deadline</dt><dd>{job.deadline ? formatDate(job.deadline) : 'Open until filled'}</dd></div>
          <div><dt className="text-slate-500">Salary</dt><dd>{job.salary_range || 'Not disclosed'}</dd></div>
        </dl>
        <div>
          {job.skills.map((s) => <Chip key={s}>{s}</Chip>)}
        </div>
      </div>

      {message && <Alert type="success">{message}</Alert>}
      {error && <Alert>{error}</Alert>}

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">About this role</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{job.description}</p>
      </section>

      {!user && (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-700">Log in as a candidate to apply for this job.</p>
          <Link to="/login" state={{ from: `/jobs/${job.id}` }} className="btn-primary">Log in to apply</Link>
        </div>
      )}

      {isCandidate && (
        <div className="flex flex-wrap gap-3">
          {job.has_applied ? (
            <Link to="/candidate/applications" className="btn-secondary">You have applied · View applications</Link>
          ) : job.is_public ? (
            <button className="btn-primary" onClick={() => setShowApply((v) => !v)}>
              {showApply ? 'Cancel' : 'Apply now'}
            </button>
          ) : (
            <Alert type="warning">This job is no longer accepting applications.</Alert>
          )}
          <button className="btn-secondary" onClick={toggleSave}>{job.is_saved ? 'Unsave job' : 'Save job'}</button>
        </div>
      )}

      {isCandidate && showApply && !job.has_applied && (
        <form onSubmit={submitApplication} className="card max-w-xl space-y-4" aria-labelledby="apply-heading">
          <h2 id="apply-heading" className="text-lg font-semibold">Submit your application</h2>
          {applyError && <Alert>{applyError}</Alert>}
          {resumes.length === 0 ? (
            <Alert type="warning">
              You have no resume yet. <Link className="underline" to="/candidate/resumes">Upload one</Link> first.
            </Alert>
          ) : (
            <Field label="Resume to send" htmlFor="resume">
              <select id="resume" className="input" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.filename}</option>)}
              </select>
            </Field>
          )}
          <Field label="Cover note (optional)" htmlFor="cover" hint="Up to 2000 characters.">
            <textarea id="cover" className="input min-h-[100px]" maxLength={2000} value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)} />
          </Field>
          <button type="submit" className="btn-primary" disabled={applying || resumes.length === 0}>
            {applying ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      )}
    </article>
  );
}
