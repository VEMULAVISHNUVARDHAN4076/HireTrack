import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { jobsApi, errorMessage } from '../services/api';
import { Alert, EmptyState, Field, Pagination, Spinner } from '../components/ui';
import { EMPLOYMENT_LABELS, formatDate } from '../utils/format';

const SORTS = [
  ['newest', 'Newest'],
  ['deadline', 'Closing soon'],
  ['title', 'Title A–Z'],
  ['experience', 'Least experience'],
];

export default function BrowseJobs() {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState({
    q: params.get('q') || '',
    location: params.get('location') || '',
    employment_type: params.get('employment_type') || '',
    skill: params.get('skill') || '',
    sort: params.get('sort') || 'newest',
  });
  const [result, setResult] = useState({ items: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const page = Number(params.get('page') || 1);

  useEffect(() => {
    setLoading(true);
    setError('');
    const query = Object.fromEntries(params.entries());
    jobsApi.list({ ...query, page, per_page: 10 })
      .then(setResult)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [params, page]);

  const submit = (event) => {
    event.preventDefault();
    const next = Object.fromEntries(Object.entries(draft).filter(([, value]) => value));
    setParams(next);
  };

  const changePage = (nextPage) => {
    const next = Object.fromEntries(params.entries());
    next.page = String(nextPage);
    setParams(next);
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Browse jobs</h1>

      <form onSubmit={submit} className="card grid gap-4 md:grid-cols-6" role="search">
        <div className="md:col-span-2">
          <Field label="Keyword" htmlFor="q">
            <input id="q" className="input" placeholder="Title, company or description" value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
          </Field>
        </div>
        <Field label="Location" htmlFor="location">
          <input id="location" className="input" value={draft.location}
            onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
        </Field>
        <Field label="Employment type" htmlFor="employment_type">
          <select id="employment_type" className="input" value={draft.employment_type}
            onChange={(e) => setDraft({ ...draft, employment_type: e.target.value })}>
            <option value="">Any</option>
            {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Skill" htmlFor="skill">
          <input id="skill" className="input" placeholder="e.g. python" value={draft.skill}
            onChange={(e) => setDraft({ ...draft, skill: e.target.value })} />
        </Field>
        <Field label="Sort by" htmlFor="sort">
          <select id="sort" className="input" value={draft.sort}
            onChange={(e) => setDraft({ ...draft, sort: e.target.value })}>
            {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <div className="md:col-span-6 flex gap-3">
          <button type="submit" className="btn-primary">Search</button>
          <button type="button" className="btn-secondary"
            onClick={() => { setDraft({ q: '', location: '', employment_type: '', skill: '', sort: 'newest' }); setParams({}); }}>
            Clear filters
          </button>
        </div>
      </form>

      {error && <Alert>{error}</Alert>}
      {loading && <Spinner label="Searching jobs" />}
      {!loading && !error && result.items.length === 0 && (
        <EmptyState title="No jobs match these filters" description="Try broader keywords or clear the filters." />
      )}
      {!loading && (
        <ul className="space-y-3">
          {result.items.map((job) => (
            <li key={job.id}>
              <Link to={`/jobs/${job.id}`} className="card block transition hover:border-brand-500">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-slate-900">{job.title}</h2>
                    <p className="text-sm text-slate-600">{job.company_name} · {job.location}</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{EMPLOYMENT_LABELS[job.employment_type]}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{job.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Experience: {job.experience_min}+ yrs · Deadline: {job.deadline ? formatDate(job.deadline) : 'Open'}
                  {job.skills.length > 0 && ` · Skills: ${job.skills.slice(0, 4).join(', ')}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && <Pagination meta={result.meta} onChange={changePage} />}
    </div>
  );
}
