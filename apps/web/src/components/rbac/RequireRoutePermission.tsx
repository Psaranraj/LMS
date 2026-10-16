import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import type { PermissionKey } from '@lms/shared-types';
import { useHasPermission } from './useHasPermission';

interface RequireRoutePermissionProps {
  anyOf: PermissionKey[];
  children: ReactNode;
}

/** Whole-page guard — redirects to /403 when the logged-in user can't reach this route at all. */
export function RequireRoutePermission({ anyOf, children }: RequireRoutePermissionProps) {
  const allowed = useHasPermission(...anyOf);
  if (!allowed) return <Navigate to="/403" replace />;
  return children;
}
