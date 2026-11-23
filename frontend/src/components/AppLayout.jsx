import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BrandMark, Icon } from './Icons';
import { Avatar, IconButton } from './ui';
import { formatLongToday, initials } from '../lib/format';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/money', label: 'Money', icon: 'wallet' },
  { to: '/work', label: 'Work', icon: 'briefcase' },
  { to: '/tasks', label: 'Daily tasks', icon: 'checkSquare' },
  { to: '/health', label: 'Health', icon: 'heart' },
  { to: '/account', label: 'Account', icon: 'user' },
];

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('You’re signed out. See you soon.');
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div className="sidebar__brand">
        <NavLink to="/" className="brand" onClick={onNavigate} aria-label="My Life Dashboard home">
          <BrandMark size={38} />
          <span className="brand__text">
            <span className="brand__name">My Life</span>
            <span className="brand__sub">Dashboard</span>
          </span>
        </NavLink>
        <IconButton
          label="Close menu"
          icon="x"
          className="sidebar__close"
          onClick={onNavigate}
        />
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        <p className="sidebar__nav-label">Overview</p>
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
            onClick={onNavigate}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
            <span className="nav-link__marker" aria-hidden="true" />
          </NavLink>
        ))}
        <p className="sidebar__nav-label sidebar__nav-label--spaced">Settings</p>
        <NavLink
          to="/account"
          className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
          onClick={onNavigate}
        >
          <Icon name="sliders" size={19} />
          <span>Account &amp; privacy</span>
          <span className="nav-link__marker" aria-hidden="true" />
        </NavLink>
      </nav>

      <div className="sidebar__spacer" />

      <div className="sidebar__today">
        <span className="sidebar__today-icon" aria-hidden="true">
          <Icon name="sun" size={18} />
        </span>
        <div>
          <span>Today</span>
          <strong>{formatLongToday()}</strong>
        </div>
      </div>

      <div className="sidebar__user">
        <NavLink to="/account" className="sidebar__user-link" onClick={onNavigate}>
          <Avatar name={user?.name} size="sm" />
          <span className="sidebar__user-text">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </span>
          <Icon name="chevronRight" size={16} />
        </NavLink>
        <IconButton label="Sign out" icon="logout" size="sm" onClick={handleLogout} />
      </div>
    </>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside id="sidebar" className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="app-main">
        <header className="mobile-header">
          <IconButton
            label="Open navigation menu"
            icon="menu"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="sidebar"
          />
          <NavLink to="/" className="mobile-brand" aria-label="My Life Dashboard home">
            <BrandMark size={30} />
            <span>My Life</span>
          </NavLink>
          <NavLink
            to="/account"
            className="mobile-avatar"
            aria-label={`Open account settings (${initials(user?.name)})`}
          >
            <Avatar name={user?.name} size="sm" />
          </NavLink>
        </header>

        <main id="main-content" className="page-shell" ref={mainRef} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
