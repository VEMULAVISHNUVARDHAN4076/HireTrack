import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobsApi, errorMessage } from '../services/api';
import { Alert, EmptyState, Spinner } from '../components/ui';
import { EMPLOYMENT_LABELS } from '../utils/format';

const FEATURES = [
  ['Upload once, apply often', 'Keep up to five PDF or DOCX resumes and choose one per application.'],
  ['Transparent AI matching', 'See which required skills your resume shows, what is missing, and how the score was calculated.'],
  ['Recruiter control', 'Recruiters review candidates, shortlist, schedule interviews and make every final decision.'],
];

export default function Home() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    jobsApi.list({ per_page: 3, sort: 'newest' })
      .then((res) => setJobs(res.items))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-14 text-white sm:px-12">
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">Find the right role, or the right candidate, faster.</h1>
        <p className="mt-4 max-w-xl text-brand-100">
          HireTrack connects job seekers and recruiters with clear application tracking and explainable resume matching.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register" className="btn bg-white text-brand-700 hover:bg-brand-50">Create a candidate account</Link>
          <Link to="/register?role=recruiter" className="btn border border-white/60 text-white hover:bg-white/10">Hire talent</Link>
          <Link to="/jobs" className="btn text-white underline-offset-4 hover:underline">Browse jobs</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {FEATURES.map(([title, text]) => (
          <div key={title} className="card">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="latest">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="latest" className="text-xl font-semibold">Latest openings</h2>
          <Link to="/jobs" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
        </div>
        {error && <Alert>{error}</Alert>}
        {!jobs && !error && <Spinner label="Loading jobs" />}
        {jobs && jobs.length === 0 && <EmptyState title="No open jobs yet" description="Check back soon." />}
        <div className="grid gap-4 md:grid-cols-3">
          {jobs?.map((job) => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="card block transition hover:border-brand-500">
              <h3 className="font-semibold text-slate-900">{job.title}</h3>
              <p className="text-sm text-slate-600">{job.company_name} · {job.location}</p>
              <p className="mt-2 text-xs text-slate-500">{EMPLOYMENT_LABELS[job.employment_type]}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
