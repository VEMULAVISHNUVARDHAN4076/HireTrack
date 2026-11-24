import { useEffect, useState } from 'react';
import { errorMessage, recruiterApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Alert, Field, Spinner } from '../../components/ui';

export default function CompanyProfile() {
  const { setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    recruiterApi.profile().then((p) => setForm({
      company_name: p.company_name || '', website: p.website || '', industry: p.industry || '',
      location: p.location || '', description: p.description || '',
    })).catch((err) => setError(errorMessage(err)));
  }, []);

  if (!form) return error ? <Alert>{error}</Alert> : <Spinner label="Loading company profile" />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const result = await recruiterApi.updateProfile({ ...form, website: form.website || null });
      setUser(result.user);
      setSuccess('Company profile saved.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4">
      <h1 className="page-title">Company profile</h1>
      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}
      <Field label="Company name" htmlFor="company_name"><input id="company_name" className="input" maxLength={150} required value={form.company_name} onChange={set('company_name')} /></Field>
      <Field label="Website" htmlFor="website" hint="Must start with https:// or http://"><input id="website" className="input" maxLength={255} value={form.website} onChange={set('website')} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Industry" htmlFor="industry"><input id="industry" className="input" maxLength={120} value={form.industry} onChange={set('industry')} /></Field>
        <Field label="Location" htmlFor="location"><input id="location" className="input" maxLength={120} value={form.location} onChange={set('location')} /></Field>
      </div>
      <Field label="About the company" htmlFor="description"><textarea id="description" className="input min-h-[120px]" maxLength={2000} value={form.description} onChange={set('description')} /></Field>
      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save company profile'}</button>
    </form>
  );
}
