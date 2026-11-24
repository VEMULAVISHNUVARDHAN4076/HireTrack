import { useEffect, useState } from 'react';
import { candidateApi, errorMessage } from '../../services/api';
import { Alert, Field, Spinner } from '../../components/ui';
import { splitList, toYear } from '../../utils/format';

const emptyEducation = { institution: '', degree: '', field_of_study: '', start_year: '', end_year: '' };
const emptyExperience = { title: '', company: '', start_year: '', end_year: '', is_current: false, description: '' };

export default function CandidateProfile() {
  const [form, setForm] = useState(null);
  const [skillsText, setSkillsText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    candidateApi.profile().then((p) => {
      setForm({
        headline: p.headline || '', phone: p.phone || '', location: p.location || '',
        summary: p.summary || '', years_experience: p.years_experience ?? 0,
        education: p.education.length ? p.education : [],
        experience: p.experience.length ? p.experience : [],
      });
      setSkillsText(p.skills.join(', '));
    }).catch((err) => setError(errorMessage(err)));
  }, []);

  if (!form) return error ? <Alert>{error}</Alert> : <Spinner label="Loading profile" />;

  const updateRow = (listKey, index, field, value) => {
    const rows = form[listKey].map((row, i) => (i === index ? { ...row, [field]: value } : row));
    setForm({ ...form, [listKey]: rows });
  };
  const addRow = (listKey, template) => setForm({ ...form, [listKey]: [...form[listKey], { ...template }] });
  const removeRow = (listKey, index) => setForm({ ...form, [listKey]: form[listKey].filter((_, i) => i !== index) });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        years_experience: Number(form.years_experience) || 0,
        education: form.education.map((e) => ({ ...e, start_year: toYear(e.start_year), end_year: toYear(e.end_year) })),
        experience: form.experience.map((x) => ({ ...x, start_year: toYear(x.start_year), end_year: toYear(x.end_year) })),
        skills: splitList(skillsText),
      };
      await candidateApi.updateProfile(payload);
      setSuccess('Profile saved.');
    } catch (err) {
      setError(errorMessage(err, 'Could not save profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <h1 className="page-title">My profile</h1>
      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <section className="card grid gap-4 md:grid-cols-2">
        <Field label="Headline" htmlFor="headline"><input id="headline" className="input" maxLength={150} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></Field>
        <Field label="Location" htmlFor="location"><input id="location" className="input" maxLength={120} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <Field label="Phone" htmlFor="phone"><input id="phone" className="input" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Years of experience" htmlFor="years"><input id="years" type="number" min="0" max="60" className="input" value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} /></Field>
        <div className="md:col-span-2">
          <Field label="Summary" htmlFor="summary"><textarea id="summary" className="input min-h-[90px]" maxLength={2000} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Skills" htmlFor="skills" hint="Comma-separated, e.g. Python, SQL, React. Up to 50 skills.">
            <input id="skills" className="input" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="card space-y-4" aria-labelledby="edu-heading">
        <div className="flex items-center justify-between">
          <h2 id="edu-heading" className="font-semibold">Education</h2>
          <button type="button" className="btn-secondary" onClick={() => addRow('education', emptyEducation)}>Add education</button>
        </div>
        {form.education.map((row, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
            <input aria-label="Institution" placeholder="Institution" className="input" value={row.institution} onChange={(e) => updateRow('education', i, 'institution', e.target.value)} />
            <input aria-label="Degree" placeholder="Degree" className="input" value={row.degree} onChange={(e) => updateRow('education', i, 'degree', e.target.value)} />
            <input aria-label="Field of study" placeholder="Field of study" className="input" value={row.field_of_study || ''} onChange={(e) => updateRow('education', i, 'field_of_study', e.target.value)} />
            <div className="flex gap-2">
              <input aria-label="Start year" type="number" placeholder="Start year" className="input" value={row.start_year || ''} onChange={(e) => updateRow('education', i, 'start_year', e.target.value)} />
              <input aria-label="End year" type="number" placeholder="End year" className="input" value={row.end_year || ''} onChange={(e) => updateRow('education', i, 'end_year', e.target.value)} />
            </div>
            <div className="md:col-span-2 text-right">
              <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => removeRow('education', i)}>Remove</button>
            </div>
          </div>
        ))}
      </section>

      <section className="card space-y-4" aria-labelledby="exp-heading">
        <div className="flex items-center justify-between">
          <h2 id="exp-heading" className="font-semibold">Work experience</h2>
          <button type="button" className="btn-secondary" onClick={() => addRow('experience', emptyExperience)}>Add experience</button>
        </div>
        {form.experience.map((row, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
            <input aria-label="Job title" placeholder="Job title" className="input" value={row.title} onChange={(e) => updateRow('experience', i, 'title', e.target.value)} />
            <input aria-label="Company" placeholder="Company" className="input" value={row.company} onChange={(e) => updateRow('experience', i, 'company', e.target.value)} />
            <div className="flex gap-2">
              <input aria-label="Start year" type="number" placeholder="Start year" className="input" value={row.start_year || ''} onChange={(e) => updateRow('experience', i, 'start_year', e.target.value)} />
              <input aria-label="End year" type="number" placeholder="End year" className="input" value={row.end_year || ''} disabled={row.is_current} onChange={(e) => updateRow('experience', i, 'end_year', e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={row.is_current} onChange={(e) => updateRow('experience', i, 'is_current', e.target.checked)} /> Current role
            </label>
            <textarea aria-label="Description" placeholder="What you did" className="input md:col-span-2" value={row.description || ''} onChange={(e) => updateRow('experience', i, 'description', e.target.value)} />
            <div className="md:col-span-2 text-right">
              <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => removeRow('experience', i)}>Remove</button>
            </div>
          </div>
        ))}
      </section>

      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}
