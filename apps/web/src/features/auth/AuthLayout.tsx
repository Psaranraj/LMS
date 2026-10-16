import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuthStore } from '../../store/auth.store';

/** Shared frame for the login and register pages. Already logged in? Go to the dashboard. */
export function AuthLayout({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  if (!hydrated) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
      <Link to="/" className="text-xl font-bold text-accent">LMS</Link>
      <div className="card flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-mut">{sub}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
