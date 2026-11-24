import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage, recruiterApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Alert, StatCard } from '../../components/ui';

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    recruiterApi.jobs({ per_page: 50 }).then(setJobs).catch((err) => setError(errorMessage(err)));
  }, []);

  const list = jobs?.items || [];
  const applicants = list.reduce((sum, job) => sum + (job.applicant_count || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Recruiter dashboard</h1>
        <p className="text-sm text-slate-600">Welcome, {user.full_name}.</p>
      </div>
      {!user.is_verified && (
        <Alert type="warning">
          Your account is awaiting verification by an administrator. You can complete your company profile now, but you cannot post jobs until verification.
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Jobs (shown)" value={jobs?.meta?.total} />
        <StatCard label="Open jobs" value={list.filter((j) => j.status === 'open').length} />
        <StatCard label="Closed jobs" value={list.filter((j) => j.status === 'closed').length} />
        <StatCard label="Applicants (recent 50 jobs)" value={applicants} />
      </section>
      <section className="flex flex-wrap gap-3">
        <Link to="/recruiter/jobs/new" className="btn-primary">Post a job</Link>
        <Link to="/recruiter/jobs" className="btn-secondary">Manage jobs</Link>
        <Link to="/recruiter/company" className="btn-secondary">Company profile</Link>
      </section>
    </div>
  );
}
