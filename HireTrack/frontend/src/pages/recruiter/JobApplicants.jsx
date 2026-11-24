import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorMessage, recruiterApi } from '../../services/api';
import { Alert, EmptyState, Field, Pagination, ScoreBar, Spinner, StatusBadge } from '../../components/ui';
import { STATUS_LABELS, formatDate } from '../../utils/format';

export default function JobApplicants() {
  const { id } = useParams();
  const [filters, setFilters] = useState({ status: '', q: '', sort: 'score', page: 1 });
  const [state, setState] = useState({ items: null, meta: null });
  const [jobTitle, setJobTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const query = { page: filters.page, per_page: 10, sort: filters.sort };
    if (filters.status) query.status = filters.status;
    if (filters.q) query.q = filters.q;
    recruiterApi.applicants(id, query).then(setState).catch((err) => setError(errorMessage(err)));
  }, [id, filters]);

  useEffect(() => {
    recruiterApi.jobs({ per_page: 50 }).then((res) => {
      const job = res.items.find((j) => String(j.id) === String(id));
      if (job) setJobTitle(job.title);
    }).catch(() => {});
  }, [id]);

  const update = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <div className="space-y-5">
      <div>
        <Link to="/recruiter/jobs" className="text-sm text-brand-700 hover:underline">← Back to jobs</Link>
        <h1 className="page-title mt-1">Applicants{jobTitle && `: ${jobTitle}`}</h1>
        <p className="text-sm text-slate-600">Scores are estimates from resume matching. Review each candidate yourself before making a decision.</p>
      </div>

      <form role="search" className="card grid gap-4 md:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Search by name" htmlFor="q">
          <input id="q" className="input" value={filters.q} onChange={(e) => update({ q: e.target.value })} />
        </Field>
        <Field label="Status" htmlFor="status">
          <select id="status" className="input" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Sort by" htmlFor="sort">
          <select id="sort" className="input" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="score">Match score (high to low)</option>
            <option value="date">Most recent</option>
          </select>
        </Field>
      </form>

      {error && <Alert>{error}</Alert>}
      {!state.items && !error && <Spinner label="Loading applicants" />}
      {state.items?.length === 0 && <EmptyState title="No applicants match these filters" />}
      {state.items?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.items.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{a.candidate_name}</p>
                    <p className="text-xs text-slate-500">{a.candidate_headline || a.candidate_email}</p>
                  </td>
                  <td className="px-4 py-3"><ScoreBar score={a.match_score} /></td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">{formatDate(a.applied_at)}</td>
                  <td className="px-4 py-3 text-right"><Link to={`/applications/${a.id}`} className="btn-secondary">Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={state.meta} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
    </div>
  );
}
