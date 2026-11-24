import { useState } from 'react';
import { authApi, errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Alert, Field } from '../components/ui';

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (form.new_password !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ current_password: form.current_password, new_password: form.new_password });
      setSuccess('Password updated.');
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="page-title">Account settings</h1>
      <section className="card space-y-1 text-sm">
        <p><span className="text-slate-500">Name:</span> {user.full_name}</p>
        <p><span className="text-slate-500">Email:</span> {user.email}</p>
        <p><span className="text-slate-500">Role:</span> {user.role}</p>
      </section>
      <form onSubmit={submit} className="card space-y-4" aria-labelledby="pw-heading">
        <h2 id="pw-heading" className="text-lg font-semibold">Change password</h2>
        {error && <Alert>{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}
        <Field label="Current password" htmlFor="current_password">
          <input id="current_password" type="password" autoComplete="current-password" className="input" required
            value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
        </Field>
        <Field label="New password" htmlFor="new_password" hint="At least 8 characters with a letter and a number.">
          <input id="new_password" type="password" autoComplete="new-password" className="input" required
            value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm_password">
          <input id="confirm_password" type="password" autoComplete="new-password" className="input" required
            value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
      </form>
    </div>
  );
}
