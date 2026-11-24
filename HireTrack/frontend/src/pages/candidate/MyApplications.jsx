import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { applicationsApi, candidateApi, errorMessage } from '../../services/api';
import { Alert, EmptyState, Field, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { STATUS_LABELS, SEEKER_WITHDRAWABLE, formatDate } from '../../utils/format';

export default function MyApplications() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const page = Number(params.get('page') || 1);
  const [result, setResult] = useState({ items: null, meta: null });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    const query = { page, per_page: 10 };
    if (status) query.status = status;
    candidateApi.applications(query)
      .then(setResult)
      .catch((err) => setError(errorMessage(err)));
  };

  useEffect(load, [status, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const withdraw = async (application) => {
    if (!window.confirm(`Withdraw your application for ${application.job_title}?`)) return;
    try {
      await applicationsApi.withdraw(application.id);
      setSuccess('Application withdrawn.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const setFilter = (value) => {
    const next = {};
    if (value) next.status = value;
    setParams(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">My applications</h1>
        <Field label="Filter by status" htmlFor="status">
          <select id="status" className="input" value={status} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>
      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}
      {!result.items && !error && <Spinner label="Loading applications" />}
      {result.items?.length === 0 && <EmptyState title="No applications found" description="Applications you submit will appear here."
        action={<Link to="/jobs" className="btn-primary">Browse jobs</Link>} />}
      {result.items?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.items.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <Link to={`/applications/${a.id}`} className="font-medium text-slate-900 hover:underline">{a.job_title}</Link>
                    <p className="text-xs text-slate-500">{a.company_name}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">{a.match_score == null ? '—' : `${a.match_score}%`}</td>
                  <td className="px-4 py-3">{formatDate(a.applied_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {SEEKER_WITHDRAWABLE.includes(a.status) && (
                      <button className="text-sm text-red-600 hover:underline" onClick={() => withdraw(a)}>Withdraw</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={result.meta} onChange={(p) => { const next = Object.fromEntries(params.entries()); next.page = String(p); setParams(next); }} />
    </div>
  );
}
