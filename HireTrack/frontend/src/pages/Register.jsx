import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import { Alert, Field } from '../components/ui';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get('role') === 'recruiter' ? 'recruiter' : 'candidate');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '', company_name: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (form.full_name.trim().length < 2) next.full_name = 'Enter your full name.';
    if (!EMAIL_RE.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) next.password = 'Include a letter and a number.';
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match.';
    if (role === 'recruiter' && form.company_name.trim().length < 2) next.company_name = 'Enter your company name.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { role, full_name: form.full_name.trim(), email: form.email, password: form.password };
      if (role === 'recruiter') payload.company_name = form.company_name.trim();
      const user = await register(payload);
      navigate(HOME_BY_ROLE[user.role], { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Registration failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="mx-auto max-w-lg">
      <div className="card space-y-5">
        <div>
          <h1 className="page-title">Create your account</h1>
          <p className="mt-1 text-sm text-slate-600">Administrator accounts are created by the system operator only.</p>
        </div>
        <fieldset className="grid grid-cols-2 gap-2" aria-label="Account type">
          {[['candidate', 'Job seeker'], ['recruiter', 'Recruiter']].map(([value, label]) => (
            <label key={value} className={`cursor-pointer rounded-lg border px-4 py-3 text-center text-sm ${role === value ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700' : 'border-slate-300'}`}>
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </fieldset>
        {error && <Alert>{error}</Alert>}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Full name" htmlFor="full_name" error={errors.full_name}>
            <input id="full_name" className="input" autoComplete="name" value={form.full_name} onChange={update('full_name')} />
          </Field>
          {role === 'recruiter' && (
            <Field label="Company name" htmlFor="company_name" error={errors.company_name}>
              <input id="company_name" className="input" value={form.company_name} onChange={update('company_name')} />
            </Field>
          )}
          <Field label="Email" htmlFor="email" error={errors.email}>
            <input id="email" type="email" autoComplete="email" className="input" value={form.email} onChange={update('email')} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters with a letter and a number.">
            <input id="password" type="password" autoComplete="new-password" className="input" value={form.password} onChange={update('password')} />
          </Field>
          <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
            <input id="confirm" type="password" autoComplete="new-password" className="input" value={form.confirm} onChange={update('confirm')} />
          </Field>
          {role === 'recruiter' && (
            <p className="text-xs text-slate-500">Recruiter accounts must be verified by an administrator before you can post jobs.</p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600">
          Already registered? <Link to="/login" className="font-medium text-brand-700 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
