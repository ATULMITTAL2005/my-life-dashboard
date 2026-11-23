import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Money from './pages/Money';
import Work from './pages/Work';
import Tasks from './pages/Tasks';
import Health from './pages/Health';
import Account from './pages/Account';
import { BrandMark } from './components/Icons';

function FullPageLoader() {
  return (
    <div className="boot-screen">
      <div className="boot-brand">
        <BrandMark size={40} />
        <span>My Life Dashboard</span>
      </div>
      <div className="spinner" aria-label="Loading" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function NotFound() {
  return (
    <div className="empty-page">
      <p className="eyebrow">404</p>
      <h1 className="page-title">This page wandered off</h1>
      <p className="muted">The link may be old, or the page may have moved.</p>
      <a className="btn btn--primary" href="/">
        Back to dashboard
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnly>
                  <Register />
                </PublicOnly>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/money" element={<Money />} />
              <Route path="/work" element={<Work />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/health" element={<Health />} />
              <Route path="/account" element={<Account />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
