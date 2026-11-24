import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { applicationsApi, downloadProtected, errorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Alert, Field, Spinner, StatusBadge, Chip } from '../../components/ui';
import MatchPanel from '../../components/MatchPanel';
import { RECRUITER_STATUSES, SEEKER_WITHDRAWABLE, STATUS_LABELS, formatDate, formatDateTime } from '../../utils/format';

export default function ApplicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [app, setApp] = useState(null);
  const [match, setMatch] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.justApplied ? 'Application submitted.' : '');
  const [statusForm, setStatusForm] = useState({ status: '', note: '' });
  const [interview, setInterview] = useState({ scheduled_at: '', mode: 'online', location_or_link: '', notes: '' });

  const isRecruiter = user.role === 'recruiter';
  const isCandidate = user.role === 'candidate';

  const load = () =>
    applicationsApi.get(id).then((data) => {
      setApp(data);
      setStatusForm((f) => ({ ...f, status: f.status || data.status }));
    }).catch((err) => setError(errorMessage(err, 'Application not found.')));

  useEffect(() => {
    load();
    applicationsApi.match(id).then(setMatch).catch(() => {});
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  const run = async (action, message) => {
    setError('');
    setSuccess('');
    try {
      await action();
      setSuccess(message);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const withdraw = () => {
    if (!window.confirm('Withdraw this application?')) return;
    run(() => applicationsApi.withdraw(id), 'Application withdrawn.');
  };

  const updateStatus = (event) => {
    event.preventDefault();
    run(() => applicationsApi.updateStatus(id, { status: statusForm.status, note: statusForm.note || null }),
      'Status updated and candidate notified.');
  };

  const scheduleInterview = (event) => {
    event.preventDefault();
    if (!interview.scheduled_at) {
      setError('Choose a date and time for the interview.');
      return;
    }
    run(() => applicationsApi.scheduleInterview(id, {
      scheduled_at: new Date(interview.scheduled_at).toISOString(),
      mode: interview.mode,
      location_or_link: interview.location_or_link || null,
      notes: interview.notes || null,
    }), 'Interview scheduled and candidate notified.').then(() =>
      setInterview({ scheduled_at: '', mode: 'online', location_or_link: '', notes: '' }));
  };

  if (error && !app) return <Alert>{error}</Alert>;
  if (!app) return <Spinner label="Loading application" />;

  const allowedTargets = RECRUITER_STATUSES.filter((s) => s !== app.status);
  const seekerTargets = SEEKER_WITHDRAWABLE.includes(app.status);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{app.job.title}</h1>
          <p className="text-slate-600">{app.company_name} · Applied {formatDate(app.applied_at)}</p>
        </div>
        <StatusBadge status={app.status} />
      </header>
      {success && <Alert type="success">{success}</Alert>}
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <MatchPanel match={match} />

          {isRecruiter && app.candidate && (
            <section className="card space-y-3" aria-labelledby="cand-heading">
              <h2 id="cand-heading" className="font-semibold">Candidate</h2>
              <p className="text-sm"><span className="text-slate-500">Name:</span> {app.candidate.name}</p>
              <p className="text-sm"><span className="text-slate-500">Email:</span> {app.candidate.email}</p>
              <p className="text-sm"><span className="text-slate-500">Headline:</span> {app.candidate.headline || '—'}</p>
              <p className="text-sm"><span className="text-slate-500">Location:</span> {app.candidate.location || '—'}</p>
              <p className="text-sm"><span className="text-slate-500">Experience:</span> {app.candidate.years_experience} years</p>
              <div>{app.candidate.skills.map((s) => <Chip key={s}>{s}</Chip>)}</div>
              {app.candidate.experience.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700">Experience</p>
                  <ul className="list-disc pl-5 text-sm text-slate-700">
                    {app.candidate.experience.map((x) => <li key={x.id}>{x.title} at {x.company} ({x.start_year || '?'}–{x.is_current ? 'present' : x.end_year || '?'})</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}

          {app.cover_note && (
            <section className="card">
              <h2 className="mb-2 font-semibold">Cover note</h2>
              <p className="whitespace-pre-line text-sm text-slate-700">{app.cover_note}</p>
            </section>
          )}

          <section className="card" aria-labelledby="hist-heading">
            <h2 id="hist-heading" className="mb-3 font-semibold">Progress</h2>
            <ol className="space-y-3">
              {app.history.map((h, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
                  <div>
                    <p className="font-medium">{STATUS_LABELS[h.status] || h.status}</p>
                    {h.note && <p className="text-slate-600">{h.note}</p>}
                    <p className="text-xs text-slate-500">{formatDateTime(h.changed_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {app.interviews.length > 0 && (
            <section className="card" aria-labelledby="int-heading">
              <h2 id="int-heading" className="mb-3 font-semibold">Interviews</h2>
              <ul className="space-y-2 text-sm">
                {app.interviews.map((i) => (
                  <li key={i.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-medium">{formatDateTime(i.scheduled_at)} · {i.mode}</p>
                    {i.location_or_link && <p className="text-slate-600">{i.location_or_link}</p>}
                    {i.notes && <p className="text-slate-600">{i.notes}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card space-y-3">
            <h2 className="font-semibold">Resume submitted</h2>
            <p className="text-sm text-slate-700">{app.resume?.filename || 'Resume no longer available'}</p>
            {app.resume && (isRecruiter || isCandidate) && (
              <button className="btn-secondary w-full" onClick={() => downloadProtected(`/resumes/${app.resume.id}/download`, app.resume.filename)
                .catch((err) => setError(errorMessage(err)))}>
                Download resume
              </button>
            )}
            <Link to={`/jobs/${app.job_id}`} className="block text-center text-sm text-brand-700 hover:underline">View job posting</Link>
          </section>

          {isCandidate && seekerTargets && (
            <section className="card">
              <h2 className="mb-2 font-semibold">Withdraw</h2>
              <p className="mb-3 text-sm text-slate-600">You can withdraw at any stage. The recruiter will see the change.</p>
              <button className="btn-danger w-full" onClick={withdraw}>Withdraw application</button>
            </section>
          )}

          {isRecruiter && app.status !== 'withdrawn' && allowedTargets.length > 0 && (
            <form onSubmit={updateStatus} className="card space-y-3" aria-labelledby="status-heading">
              <h2 id="status-heading" className="font-semibold">Update status</h2>
              <Field label="New status" htmlFor="new-status">
                <select id="new-status" className="input" value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                  <option value={app.status}>{STATUS_LABELS[app.status]} (current)</option>
                  {allowedTargets.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </Field>
              <Field label="Note (visible to candidate)" htmlFor="status-note">
                <textarea id="status-note" className="input" maxLength={500} value={statusForm.note}
                  onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })} />
              </Field>
              <button type="submit" className="btn-primary w-full" disabled={statusForm.status === app.status}>Save status</button>
            </form>
          )}

          {isRecruiter && ['under_review', 'shortlisted', 'interview'].includes(app.status) && (
            <form onSubmit={scheduleInterview} className="card space-y-3" aria-labelledby="sched-heading">
              <h2 id="sched-heading" className="font-semibold">Schedule interview</h2>
              <Field label="Date and time" htmlFor="sched-at">
                <input id="sched-at" type="datetime-local" className="input" value={interview.scheduled_at}
                  onChange={(e) => setInterview({ ...interview, scheduled_at: e.target.value })} />
              </Field>
              <Field label="Mode" htmlFor="sched-mode">
                <select id="sched-mode" className="input" value={interview.mode} onChange={(e) => setInterview({ ...interview, mode: e.target.value })}>
                  <option value="online">Online</option>
                  <option value="onsite">On site</option>
                  <option value="phone">Phone</option>
                </select>
              </Field>
              <Field label="Location or meeting link" htmlFor="sched-loc">
                <input id="sched-loc" className="input" maxLength={500} value={interview.location_or_link}
                  onChange={(e) => setInterview({ ...interview, location_or_link: e.target.value })} />
              </Field>
              <Field label="Notes" htmlFor="sched-notes">
                <textarea id="sched-notes" className="input" maxLength={1000} value={interview.notes}
                  onChange={(e) => setInterview({ ...interview, notes: e.target.value })} />
              </Field>
              <button type="submit" className="btn-primary w-full">Schedule</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
