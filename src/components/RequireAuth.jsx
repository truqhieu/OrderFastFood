import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { HOME_BY_ROLE } from '../utils.js';

/** `roles` limits access to the given roles; omit it to allow any logged-in user. */
export default function RequireAuth({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role] || '/'} replace />;
  return children;
}
