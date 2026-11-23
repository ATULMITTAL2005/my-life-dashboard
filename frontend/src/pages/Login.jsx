import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import { Button, FormAlert, PasswordField, TextField } from '../components/ui';
import { Icon } from '../components/Icons';

const DEMO = { email: 'demo@mylifedashboard.app', password: 'Demo1234!' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Sign in · My Life Dashboard';
  }, []);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (!form.password) next.password = 'Enter your password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      await login(form.email.trim(), form.password);
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (err) {
      setServerError(err.message);
      if (err.errors) setErrors(err.errors);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setForm(DEMO);
    setErrors({});
    setServerError('');
  };

  return (
    <AuthShell>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <header className="auth-heading">
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in to your dashboard</h1>
          <p className="muted">Pick up exactly where you left off.</p>
        </header>

        <FormAlert>{serverError}</FormAlert>

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          required
        />

        <Button type="submit" className="btn--block" loading={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>

        <div className="demo-card">
          <div className="demo-card__text">
            <span className="demo-card__icon" aria-hidden="true">
              <Icon name="sparkles" size={17} />
            </span>
            <div>
              <strong>Just want a look around?</strong>
              <p>Use the seeded demo account to explore every feature.</p>
            </div>
          </div>
          <button type="button" className="btn btn--secondary btn--sm" onClick={fillDemo}>
            Fill demo details
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
