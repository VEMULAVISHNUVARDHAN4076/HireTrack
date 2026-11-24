import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import { Alert, Field } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(params.get('expired') ? 'Your session expired. Please log in again.' : '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      const target = location.state?.from || HOME_BY_ROLE[user.role] || '/';
      navigate(target, { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Unable to log in.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card space-y-5">
        <div>
          <h1 className="page-title">Log in</h1>
          <p className="mt-1 text-sm text-slate-600">Access your HireTrack account.</p>
        </div>
        {error && <Alert>{error}</Alert>}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Email" htmlFor="email">
            <input id="email" type="email" autoComplete="email" className="input" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password" htmlFor="password">
            <input id="password" type="password" autoComplete="current-password" className="input" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600">
          New here? <Link to="/register" className="font-medium text-brand-700 hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
