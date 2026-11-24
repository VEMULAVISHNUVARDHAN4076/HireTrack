import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage, recruiterApi } from '../../services/api';
import { Alert, EmptyState, Field, Pagination, Spinner } from '../../components/ui';
import { EMPLOYMENT_LABELS, formatDate } from '../../utils/format';

export default function ManageJobs() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Number(params.get('page') || 1);
  const [state, setState] = useState({ items: null, meta: null });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    const query = { page, per_page: 10 };
    if (status) query.status = status;
    recruiterApi.jobs(query).then(setState).catch((err) => setError(errorMessage(err)));
  };
  useEffect(load, [status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn, message) => {
    setError('');
    setSuccess('');
    try {
      await fn();
      setSuccess(message);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = (job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    act(() => recruiterApi.deleteJob(job.id), 'Job deleted.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Manage jobs</h1>
        <div className="flex items-end gap-3">
          <Field label="Status" htmlFor="status">
            <select id="status" className="input" value={status}
              onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})}>
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="removed">Removed by admin</option>
            </select>
          </Field>
          <Link to="/recruiter/jobs/new" className="btn-primary">Post a job</Link>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}
      {!state.items && !error && <Spinner label="Loading jobs" />}
      {state.items?.length === 0 && <EmptyState title="No jobs yet" description="Post your first vacancy to start receiving applications."
        action={<Link to="/recruiter/jobs/new" className="btn-primary">Post a job</Link>} />}
      <ul className="space-y-3">
        {state.items?.map((job) => (
          <li key={job.id} className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">{job.title}</h2>
              <p className="text-sm text-slate-600">{job.location} · {EMPLOYMENT_LABELS[job.employment_type]} · Posted {formatDate(job.created_at)}</p>
              <p className="mt-1 text-xs text-slate-500">
                Status: <span className="font-medium capitalize">{job.status}</span> · Applicants: {job.applicant_count}
              </p>
              {job.status === 'removed' && <p className="mt-1 text-xs text-red-700">Reason: {job.removal_reason}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/recruiter/jobs/${job.id}/applicants`} className="btn-secondary">Applicants</Link>
              {job.status !== 'removed' && <Link to={`/recruiter/jobs/${job.id}/edit`} className="btn-secondary">Edit</Link>}
              {job.status === 'open' && <button className="btn-secondary" onClick={() => act(() => recruiterApi.closeJob(job.id), 'Job closed.')}>Close</button>}
              {job.status === 'closed' && <button className="btn-secondary" onClick={() => act(() => recruiterApi.reopenJob(job.id), 'Job reopened.')}>Reopen</button>}
              {job.status !== 'removed' && job.applicant_count === 0 && <button className="btn-danger" onClick={() => remove(job)}>Delete</button>}
            </div>
          </li>
        ))}
      </ul>
      <Pagination meta={state.meta} onChange={(p) => { const next = Object.fromEntries(params.entries()); next.page = String(p); setParams(next); }} />
    </div>
  );
}
