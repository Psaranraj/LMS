import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../../store/auth.store';

export function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const location = useLocation();

  if (!hydrated) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
