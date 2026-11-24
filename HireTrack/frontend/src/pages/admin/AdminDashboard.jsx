import { useEffect, useState } from 'react';
import { adminApi, downloadProtected, errorMessage } from '../../services/api';
import { Alert, EmptyState, Field, Pagination, Spinner, StatCard } from '../../components/ui';
import { STATUS_LABELS, formatDate, formatDateTime } from '../../utils/format';

const TABS = ['Overview', 'Users', 'Jobs', 'Activity'];

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="page-title">Administration</h1>
      <nav aria-label="Admin sections" className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
            {t}
          </button>
        ))}
      </nav>
      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}
      {tab === 'Overview' && <Overview setError={setError} />}
      {tab === 'Users' && <Users setError={setError} setSuccess={setSuccess} />}
      {tab === 'Jobs' && <Jobs setError={setError} setSuccess={setSuccess} />}
      {tab === 'Activity' && <Activity setError={setError} />}
    </div>
  );
}

function Overview({ setError }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    adminApi.stats().then(setStats).catch((err) => setError(errorMessage(err)));
  }, [setError]);
  if (!stats) return <Spinner label="Loading statistics" />;
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Candidates" value={stats.candidates} />
        <StatCard label="Recruiters" value={stats.recruiters} />
        <StatCard label="Pending verification" value={stats.pending_recruiters} />
        <StatCard label="Suspended accounts" value={stats.suspended_users} />
        <StatCard label="Jobs (all)" value={stats.jobs_total} />
        <StatCard label="Open jobs" value={stats.jobs_open} />
        <StatCard label="Removed jobs" value={stats.jobs_removed} />
        <StatCard label="Applications" value={stats.applications_total} />
      </section>
      <section className="card">
        <h2 className="mb-3 font-semibold">Applications by status</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats.applications_by_status).map(([s, n]) => (
            <li key={s} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span>{STATUS_LABELS[s]}</span><span className="font-semibold">{n}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Export report</h2>
          <p className="text-sm text-slate-600">CSV of all applications. Candidate contact details are excluded.</p>
        </div>
        <button className="btn-secondary" onClick={() => downloadProtected('/admin/reports/applications?format=csv', 'applications.csv')
          .catch((err) => setError(errorMessage(err)))}>Download CSV</button>
      </section>
    </div>
  );
}

function Users({ setError, setSuccess }) {
  const [filters, setFilters] = useState({ role: '', state: '', q: '', page: 1 });
  const [result, setResult] = useState({ items: null, meta: null });

  const load = () => {
    const query = { page: filters.page, per_page: 10 };
    if (filters.role) query.role = filters.role;
    if (filters.state) query.state = filters.state;
    if (filters.q) query.q = filters.q;
    adminApi.users(query).then(setResult).catch((err) => setError(errorMessage(err)));
  };
  useEffect(load, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = async (user, body, message) => {
    try {
      await adminApi.updateUser(user.id, body);
      setSuccess(message);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="card grid gap-4 md:grid-cols-4">
        <Field label="Search" htmlFor="uq"><input id="uq" className="input" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })} /></Field>
        <Field label="Role" htmlFor="urole">
          <select id="urole" className="input" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}>
            <option value="">All</option><option value="candidate">Candidates</option><option value="recruiter">Recruiters</option>
          </select>
        </Field>
        <Field label="State" htmlFor="ustate">
          <select id="ustate" className="input" value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value, page: 1 })}>
            <option value="">All</option><option value="pending">Pending verification</option><option value="suspended">Suspended</option>
          </select>
        </Field>
      </div>
      {!result.items && <Spinner label="Loading users" />}
      {result.items?.length === 0 && <EmptyState title="No users match these filters" />}
      {result.items?.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Verified</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><p className="font-medium">{u.full_name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3">{u.is_verified ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">{u.is_active ? 'Active' : 'Suspended'}</td>
                  <td className="px-4 py-3">{formatDate(u.created_at)}</td>
                  <td className="space-x-3 px-4 py-3 text-right">
                    {u.role === 'recruiter' && !u.is_verified && (
                      <button className="text-brand-700 hover:underline" onClick={() => change(u, { is_verified: true }, `${u.full_name} verified.`)}>Verify</button>
                    )}
                    {u.is_active ? (
                      <button className="text-red-600 hover:underline" onClick={() => {
                        if (window.confirm(`Suspend ${u.full_name}? They will be logged out on their next request.`))
                          change(u, { is_active: false }, `${u.full_name} suspended.`);
                      }}>Suspend</button>
                    ) : (
                      <button className="text-green-700 hover:underline" onClick={() => change(u, { is_active: true }, `${u.full_name} reactivated.`)}>Activate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={result.meta} onChange={(p) => setFilters({ ...filters, page: p })} />
    </div>
  );
}

function Jobs({ setError, setSuccess }) {
  const [filters, setFilters] = useState({ status: '', q: '', page: 1 });
  const [result, setResult] = useState({ items: null, meta: null });

  const load = () => {
    const query = { page: filters.page, per_page: 10 };
    if (filters.status) query.status = filters.status;
    if (filters.q) query.q = filters.q;
    adminApi.jobs(query).then(setResult).catch((err) => setError(errorMessage(err)));
  };
  useEffect(load, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (job) => {
    const reason = window.prompt(`Reason for removing "${job.title}" (5–500 characters):`);
    if (reason === null) return;
    try {
      await adminApi.removeJob(job.id, reason);
      setSuccess('Job removed and recruiter notified.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const restore = async (job) => {
    try {
      await adminApi.restoreJob(job.id);
      setSuccess('Job restored as closed. The recruiter can reopen it.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="card grid gap-4 md:grid-cols-3">
        <Field label="Search" htmlFor="jq"><input id="jq" className="input" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })} /></Field>
        <Field label="Status" htmlFor="jstatus">
          <select id="jstatus" className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
            <option value="">All</option><option value="open">Open</option><option value="closed">Closed</option><option value="removed">Removed</option>
          </select>
        </Field>
      </div>
      {!result.items && <Spinner label="Loading jobs" />}
      {result.items?.length === 0 && <EmptyState title="No jobs match these filters" />}
      <ul className="space-y-3">
        {result.items?.map((job) => (
          <li key={job.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{job.title}</p>
              <p className="text-sm text-slate-600">{job.company_name} · {job.location} · {job.applicant_count} applicants</p>
              <p className="text-xs capitalize text-slate-500">Status: {job.status}{job.removal_reason ? ` — ${job.removal_reason}` : ''}</p>
            </div>
            {job.status !== 'removed' ? (
              <button className="btn-danger" onClick={() => remove(job)}>Remove listing</button>
            ) : (
              <button className="btn-secondary" onClick={() => restore(job)}>Restore</button>
            )}
          </li>
        ))}
      </ul>
      <Pagination meta={result.meta} onChange={(p) => setFilters({ ...filters, page: p })} />
    </div>
  );
}

function Activity({ setError }) {
  const [result, setResult] = useState({ items: null, meta: null });
  const [page, setPage] = useState(1);
  useEffect(() => {
    adminApi.activity({ page, per_page: 15 }).then(setResult).catch((err) => setError(errorMessage(err)));
  }, [page, setError]);
  if (!result.items) return <Spinner label="Loading activity" />;
  if (result.items.length === 0) return <EmptyState title="No administrative activity yet" />;
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3">{formatDateTime(log.created_at)}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.target_type} #{log.target_id}</td>
                <td className="px-4 py-3 text-slate-600">{log.details || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination meta={result.meta} onChange={setPage} />
    </div>
  );
}
