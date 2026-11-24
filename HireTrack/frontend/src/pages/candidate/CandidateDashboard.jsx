import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { candidateApi, errorMessage, jobsApi, notificationsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Alert, StatCard, StatusBadge } from '../../components/ui';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      candidateApi.applications({ per_page: 5 }),
      jobsApi.saved({ per_page: 1 }),
      candidateApi.resumes(),
      notificationsApi.list({ per_page: 1 }),
    ])
      .then(([apps, saved, resumes, notes]) => {
        setRecent(apps.items);
        setStats({
          applications: apps.meta.total,
          saved: saved.meta.total,
          resumes: resumes.length,
          unread: notes.unreadCount,
        });
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome back, {user.full_name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-600">Track your applications and find your next role.</p>
      </div>
      {error && <Alert>{error}</Alert>}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Applications" value={stats?.applications} />
        <StatCard label="Saved jobs" value={stats?.saved} />
        <StatCard label="Resumes" value={stats?.resumes} />
        <StatCard label="Unread notifications" value={stats?.unread} />
      </section>
      <section className="flex flex-wrap gap-3">
        <Link to="/jobs" className="btn-primary">Browse jobs</Link>
        <Link to="/candidate/recommendations" className="btn-secondary">View recommendations</Link>
        <Link to="/candidate/resumes" className="btn-secondary">Manage resumes</Link>
        <Link to="/candidate/profile" className="btn-secondary">Update profile</Link>
      </section>
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent applications</h2>
          <Link to="/candidate/applications" className="text-sm text-brand-700 hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">You have not applied to any jobs yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <Link to={`/applications/${a.id}`} className="font-medium text-slate-900 hover:underline">{a.job_title}</Link>
                  <p className="text-xs text-slate-500">{a.company_name}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
