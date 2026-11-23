import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthShell from '../components/AuthShell';
import { Button, FormAlert, PasswordField, TextField } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Create account · My Life Dashboard';
  }, []);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your name.';
    if (!form.email.trim()) next.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'Include at least one letter and one number.';
    }
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      toast.success('Your dashboard is ready. Welcome!');
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err.message);
      if (err.errors) setErrors(err.errors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <header className="auth-heading">
          <p className="eyebrow">A fresh start</p>
          <h1>Create your dashboard</h1>
          <p className="muted">
            One account for your money, work, tasks, and health. No noise.
          </p>
        </header>

        <FormAlert>{serverError}</FormAlert>

        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          required
        />

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="Use 8+ characters with at least one letter and one number."
          required
        />

        <PasswordField
          label="Confirm password"
          name="confirm"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
          required
        />

        <Button type="submit" className="btn--block" loading={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        <p className="auth-fineprint">
          Your password is hashed before it is stored, and your data is scoped to your account.
        </p>
      </form>
    </AuthShell>
  );
}
