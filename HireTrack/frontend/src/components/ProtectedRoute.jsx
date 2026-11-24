import { Navigate, useLocation } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from '../context/AuthContext';
import { Spinner } from './ui';

/** UI-level guard only. The API enforces the same roles on every request. */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8"><Spinner label="Checking your session" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role] || '/'} replace />;
  return children;
}
