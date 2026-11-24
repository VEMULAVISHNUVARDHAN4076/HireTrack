import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage, jobsApi } from '../../services/api';
import { Alert, EmptyState, Pagination, Spinner } from '../../components/ui';
import { EMPLOYMENT_LABELS } from '../../utils/format';

export default function SavedJobs() {
  const [state, setState] = useState({ items: null, meta: null });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = () => jobsApi.saved({ page, per_page: 10 }).then(setState).catch((err) => setError(errorMessage(err)));
  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const unsave = async (job) => {
    try {
      await jobsApi.unsave(job.id);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">Saved jobs</h1>
      {error && <Alert>{error}</Alert>}
      {!state.items && !error && <Spinner label="Loading saved jobs" />}
      {state.items?.length === 0 && <EmptyState title="No saved jobs" description="Save jobs from the job page to review them later."
        action={<Link to="/jobs" className="btn-primary">Browse jobs</Link>} />}
      <ul className="space-y-3">
        {state.items?.map((job) => (
          <li key={job.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link to={`/jobs/${job.id}`} className="font-semibold text-slate-900 hover:underline">{job.title}</Link>
              <p className="text-sm text-slate-600">{job.company_name} · {job.location} · {EMPLOYMENT_LABELS[job.employment_type]}</p>
              {!job.is_public && <p className="text-xs text-amber-700">This job is no longer open.</p>}
            </div>
            <button className="btn-secondary" onClick={() => unsave(job)}>Remove</button>
          </li>
        ))}
      </ul>
      <Pagination meta={state.meta} onChange={setPage} />
    </div>
  );
}
