import type { ReactNode } from 'react';
import type { PermissionKey } from '@lms/shared-types';
import { useHasPermission } from './useHasPermission';

interface PermissionGateProps {
  /** Grants access if the user holds ANY of these permission keys. */
  anyOf: PermissionKey[];
  children: ReactNode;
  /** Rendered instead of children when the permission check fails — omit to render nothing. */
  fallback?: ReactNode;
}

/**
 * The one reusable pattern for in-page permission checks — used consistently
 * across every feature (Discount/Refund buttons on billing, Delete on
 * products, the Settings nav item, ...) instead of one-off `if` checks.
 * This is a UX convenience only: the same permission is always re-checked
 * server-side by requirePermission() on the API.
 */
export function PermissionGate({ anyOf, children, fallback = null }: PermissionGateProps) {
  const allowed = useHasPermission(...anyOf);
  return <>{allowed ? children : fallback}</>;
}
