import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { candidateApi, errorMessage } from '../../services/api';
import { Alert, Chip, EmptyState, ScoreBar, Spinner } from '../../components/ui';
import { EMPLOYMENT_LABELS } from '../../utils/format';

export default function Recommendations() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    candidateApi.recommendations().then(setData).catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner label="Finding matching jobs" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">AI job recommendations</h1>
        <p className="text-sm text-slate-600">
          Ranked from your latest resume{data.resume_used ? ` (${data.resume_used})` : ''} and profile skills. Only open jobs
          that have not passed their deadline are included. Scores are estimates.
        </p>
      </div>
      {data.items.length === 0 && (
        <EmptyState title="No recommendations yet" description={data.message || 'Add skills to your profile or upload a resume.'}
          action={<Link to="/candidate/profile" className="btn-primary">Update profile</Link>} />
      )}
      <ul className="space-y-4">
        {data.items.map((item) => (
          <li key={item.job.id} className="card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link to={`/jobs/${item.job.id}`} className="text-lg font-semibold text-slate-900 hover:underline">{item.job.title}</Link>
                <p className="text-sm text-slate-600">{item.job.company_name} · {item.job.location} · {EMPLOYMENT_LABELS[item.job.employment_type]}</p>
              </div>
              <ScoreBar score={item.score} />
            </div>
            <p className="text-sm text-slate-700"><span className="font-medium">Why this job:</span> {item.reason}</p>
            <div>
              {item.matched_skills.map((s) => <Chip key={s} tone="green">{s}</Chip>)}
              {item.missing_skills.map((s) => <Chip key={s} tone="red">{s}</Chip>)}
              {item.unconfirmed_skills.map((s) => <Chip key={s} tone="amber">{s}</Chip>)}
            </div>
            {item.already_applied ? (
              <span className="text-sm text-slate-500">You have already applied.</span>
            ) : (
              <Link to={`/jobs/${item.job.id}`} className="btn-secondary">View and apply</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
