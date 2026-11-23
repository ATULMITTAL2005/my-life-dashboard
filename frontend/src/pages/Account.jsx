import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { CURRENCIES, DASHBOARD_CARDS } from '../lib/constants';
import { formatDate } from '../lib/format';
import {
  Avatar,
  Badge,
  Button,
  FormAlert,
  InsetNote,
  PageHeader,
  PasswordField,
  SectionHeader,
  SelectField,
  Switch,
  TextField,
} from '../components/ui';
import { Icon } from '../components/Icons';

const PRIVACY_POINTS = [
  {
    icon: 'lock',
    title: 'Passwords are hashed',
    text: 'Passwords are hashed with bcrypt (12 rounds) and never stored or returned as plain text.',
  },
  {
    icon: 'shield',
    title: 'Signed sessions',
    text: 'Every request uses a signed JWT, and expired or invalid sessions are rejected.',
  },
  {
    icon: 'user',
    title: 'Your data is scoped to you',
    text: 'Every database query is filtered by your user id. No other account can read or change your records.',
  },
  {
    icon: 'heart',
    title: 'Health stays private',
    text: 'Health check-ins and goals are visible only inside your own signed-in account.',
  },
];

export default function Account() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: '', email: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currency, setCurrency] = useState('INR');
  const [cards, setCards] = useState([]);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({ name: user.name || '', email: user.email || '' });
    setCurrency(user.preferences?.currency || 'INR');
    setCards(user.preferences?.dashboardCards || DASHBOARD_CARDS.map((card) => card.id));
  }, [user]);

  const updateProfileField = (key) => (event) => {
    setProfile((current) => ({ ...current, [key]: event.target.value }));
    setProfileErrors((current) => ({ ...current, [key]: undefined }));
    setProfileError('');
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const next = {};
    if (profile.name.trim().length < 2) next.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    setProfileErrors(next);
    if (Object.keys(next).length) return;

    setSavingProfile(true);
    setProfileError('');
    try {
      const response = await api('/auth/profile', {
        method: 'PATCH',
        body: { name: profile.name.trim(), email: profile.email.trim() },
      });
      updateUser(response.user);
      toast.success('Profile updated.');
    } catch (err) {
      setProfileError(err.message);
      if (err.errors) setProfileErrors(err.errors);
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleCard = (id, checked) => {
    if (!checked && cards.length === 1) {
      toast.error('Keep at least one summary card visible.');
      return;
    }
    setCards((current) => (checked ? [...current, id] : current.filter((card) => card !== id)));
  };

  const savePreferences = async () => {
    if (!cards.length) {
      toast.error('Keep at least one summary card visible.');
      return;
    }
    setSavingPrefs(true);
    try {
      const response = await api('/auth/preferences', {
        method: 'PATCH',
        body: { currency, dashboardCards: cards },
      });
      updateUser(response.user);
      toast.success('Preferences saved.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPrefs(false);
    }
  };

  const updatePassword = (key) => (event) => {
    setPasswords((current) => ({ ...current, [key]: event.target.value }));
    setPasswordErrors((current) => ({ ...current, [key]: undefined }));
    setPasswordError('');
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const next = {};
    if (!passwords.currentPassword) next.currentPassword = 'Enter your current password.';
    if (passwords.newPassword.length < 8) next.newPassword = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(passwords.newPassword) || !/[0-9]/.test(passwords.newPassword)) {
      next.newPassword = 'Include at least one letter and one number.';
    }
    if (passwords.confirm !== passwords.newPassword) next.confirm = 'Passwords do not match.';
    setPasswordErrors(next);
    if (Object.keys(next).length) return;

    setSavingPassword(true);
    setPasswordError('');
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
      });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password updated.');
    } catch (err) {
      setPasswordError(err.message);
      if (err.errors) setPasswordErrors(err.errors);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('You’re signed out. See you soon.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="account-page">
      <PageHeader
        eyebrow="Account & privacy"
        title="Your space, your rules"
        description="Manage your details, preferences, and the small ways this app stays private."
        actions={
          <Button variant="secondary" icon="logout" onClick={handleLogout}>
            Sign out
          </Button>
        }
      />

      <div className="account-layout">
        <div className="account-main">
          <section className="card" aria-labelledby="profile-title">
            <div className="profile-heading">
              <Avatar name={user?.name} size="lg" />
              <div>
                <p className="eyebrow">Signed in as</p>
                <h2 id="profile-title">{user?.name}</h2>
                <p className="muted">{user?.email}</p>
              </div>
              <Badge tone="sage">Private account</Badge>
            </div>

            <form className="form-stack" onSubmit={saveProfile} noValidate>
              <FormAlert>{profileError}</FormAlert>
              <div className="form-grid">
                <TextField
                  label="Name"
                  autoComplete="name"
                  value={profile.name}
                  onChange={updateProfileField('name')}
                  error={profileErrors.name}
                  maxLength={80}
                  required
                />
                <TextField
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={profile.email}
                  onChange={updateProfileField('email')}
                  error={profileErrors.email}
                  required
                />
              </div>
              <div className="form-actions">
                <Button type="submit" loading={savingProfile}>
                  Save profile
                </Button>
              </div>
            </form>
          </section>

          <section className="card" aria-labelledby="prefs-title">
            <SectionHeader
              title="Preferences"
              description="Make the dashboard fit the way you think."
            />
            <h2 id="prefs-title" className="sr-only">
              Preferences
            </h2>

            <SelectField
              label="Currency"
              options={CURRENCIES}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              hint="Used across the dashboard, transactions, and budgets."
              className="prefs-currency"
            />

            <div className="prefs-cards">
              <p className="field__label">Dashboard summary cards</p>
              <div className="switch-list">
                {DASHBOARD_CARDS.map((card) => (
                  <Switch
                    key={card.id}
                    label={card.title}
                    description={card.description}
                    checked={cards.includes(card.id)}
                    onChange={(checked) => toggleCard(card.id, checked)}
                  />
                ))}
              </div>
            </div>

            <div className="form-actions">
              <Button onClick={savePreferences} loading={savingPrefs}>
                Save preferences
              </Button>
            </div>
          </section>

          <section className="card" aria-labelledby="password-title">
            <SectionHeader
              title="Password"
              description="Choose something long, unique, and easy for you to remember."
            />
            <h2 id="password-title" className="sr-only">
              Change password
            </h2>

            <form className="form-stack" onSubmit={savePassword} noValidate>
              <FormAlert>{passwordError}</FormAlert>

              <PasswordField
                label="Current password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={updatePassword('currentPassword')}
                error={passwordErrors.currentPassword}
                required
              />
              <div className="form-grid">
                <PasswordField
                  label="New password"
                  autoComplete="new-password"
                  value={passwords.newPassword}
                  onChange={updatePassword('newPassword')}
                  error={passwordErrors.newPassword}
                  hint="8+ characters with a letter and a number."
                  required
                />
                <PasswordField
                  label="Confirm new password"
                  autoComplete="new-password"
                  value={passwords.confirm}
                  onChange={updatePassword('confirm')}
                  error={passwordErrors.confirm}
                  required
                />
              </div>
              <div className="form-actions">
                <Button type="submit" loading={savingPassword}>
                  Update password
                </Button>
              </div>
            </form>
          </section>
        </div>

        <aside className="account-side" aria-label="Privacy and session information">
          <section className="card" aria-labelledby="privacy-title">
            <SectionHeader
              title="Privacy"
              description="How your data is protected"
            />
            <h2 id="privacy-title" className="sr-only">
              Privacy
            </h2>
            <ul className="privacy-list">
              {PRIVACY_POINTS.map((point) => (
                <li key={point.title}>
                  <span className="privacy-list__icon" aria-hidden="true">
                    <Icon name={point.icon} size={17} />
                  </span>
                  <div>
                    <strong>{point.title}</strong>
                    <p>{point.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <InsetNote icon="shield" title="No ads, no sharing">
              This dashboard has no analytics or advertising trackers. Your data is used only to
              show your own summaries.
            </InsetNote>
          </section>

          <section className="card" aria-labelledby="session-title">
            <SectionHeader title="Session" description="This device" />
            <h2 id="session-title" className="sr-only">
              Session
            </h2>
            <div className="session-card">
              <Avatar name={user?.name} size="md" />
              <div>
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
            </div>
            <dl className="session-meta">
              <div>
                <dt>Member since</dt>
                <dd>{formatDate(user?.createdAt, { year: true })}</dd>
              </div>
              <div>
                <dt>Session</dt>
                <dd>Signed in with JWT</dd>
              </div>
            </dl>
            <Button variant="secondary" className="btn--block" icon="logout" onClick={handleLogout}>
              Sign out of this device
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
