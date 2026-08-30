import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guard: requires authentication. Renders children only for logged-in users.
 */
export function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children || <Outlet />;
}

/**
 * Guard: restricts access to specific roles.
 */
export function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children || <Outlet />;
}

/**
 * Guard: redirects logged-in users away from auth pages (login/register).
 */
export function PublicOnlyRoute({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <div className="page-loading">Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return children || <Outlet />;
}
