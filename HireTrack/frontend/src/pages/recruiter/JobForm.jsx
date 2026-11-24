import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { errorMessage, jobsApi, recruiterApi } from '../../services/api';
import { Alert, Field, Spinner } from '../../components/ui';
import { EMPLOYMENT_LABELS, splitList } from '../../utils/format';

const EMPTY = { title: '', description: '', location: '', employment_type: 'full_time', experience_min: 0, salary_range: '', deadline: '' };

export default function JobForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [skillsText, setSkillsText] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!editing) return;
    jobsApi.get(id).then((job) => {
      setForm({
        title: job.title, description: job.description, location: job.location,
        employment_type: job.employment_type, experience_min: job.experience_min,
        salary_range: job.salary_range || '', deadline: job.deadline || '',
      });
      setSkillsText(job.skills.join(', '));
    }).catch((err) => setError(errorMessage(err, 'Job not found.')))
      .finally(() => setLoading(false));
  }, [id, editing]);

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Title must be at least 3 characters.';
    if (form.description.trim().length < 20) next.description = 'Describe the role in at least 20 characters.';
    if (form.location.trim().length < 2) next.location = 'Enter a location.';
    if (form.deadline && form.deadline < today) next.deadline = 'Deadline cannot be in the past.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!validate()) return;
    setSaving(true);
    const payload = {
      ...form,
      experience_min: Number(form.experience_min) || 0,
      salary_range: form.salary_range || null,
      deadline: form.deadline || null,
      skills: splitList(skillsText),
    };
    try {
      if (editing) await recruiterApi.updateJob(id, payload);
      else await recruiterApi.createJob(payload);
      navigate('/recruiter/jobs', { state: { saved: true } });
    } catch (err) {
      setError(errorMessage(err, 'Could not save the job.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="Loading job" />;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <form onSubmit={submit} noValidate className="card max-w-3xl space-y-5">
      <h1 className="page-title">{editing ? 'Edit job' : 'Post a new job'}</h1>
      {error && <Alert>{error}</Alert>}
      <Field label="Job title" htmlFor="title" error={errors.title}>
        <input id="title" className="input" maxLength={150} value={form.title} onChange={set('title')} />
      </Field>
      <Field label="Description" htmlFor="description" error={errors.description} hint="Responsibilities, requirements and benefits. Up to 10,000 characters.">
        <textarea id="description" className="input min-h-[180px]" maxLength={10000} value={form.description} onChange={set('description')} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Location" htmlFor="location" error={errors.location}>
          <input id="location" className="input" maxLength={120} value={form.location} onChange={set('location')} />
        </Field>
        <Field label="Employment type" htmlFor="employment_type">
          <select id="employment_type" className="input" value={form.employment_type} onChange={set('employment_type')}>
            {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Minimum experience (years)" htmlFor="experience_min">
          <input id="experience_min" type="number" min="0" max="50" className="input" value={form.experience_min} onChange={set('experience_min')} />
        </Field>
        <Field label="Salary range (optional)" htmlFor="salary_range">
          <input id="salary_range" className="input" maxLength={80} value={form.salary_range} onChange={set('salary_range')} />
        </Field>
        <Field label="Application deadline (optional)" htmlFor="deadline" error={errors.deadline}>
          <input id="deadline" type="date" min={today} className="input" value={form.deadline} onChange={set('deadline')} />
        </Field>
        <Field label="Required skills" htmlFor="skills" hint="Comma-separated. These drive matching scores.">
          <input id="skills" className="input" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Publish job'}</button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/recruiter/jobs')}>Cancel</button>
      </div>
    </form>
  );
}
