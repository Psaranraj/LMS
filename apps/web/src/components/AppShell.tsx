import { useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { NAV } from '../config/nav';
import { api } from '../lib/apiClient';
import { useAuthStore } from '../store/auth.store';
import { useToastStore } from '../store/toast.store';
import { Avatar, Pill } from './ui';

/** The frame around every signed-in page: top bar with a menu built from the user's permissions. */
export function AppShell() {
  const user = useAuthStore((s) => s.user)!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const message = useToastStore((s) => s.message);
  const items = NAV.filter((n) => n.anyOf.length === 0 || n.anyOf.some((k) => user.permissions.includes(k)));

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    useAuthStore.getState().clearSession();
    queryClient.clear();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line bg-panel px-5">
        <span className="py-3 text-xl font-bold text-accent">LMS</span>
        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Main">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-[3px] px-2 py-3.5 text-sm font-semibold ${isActive ? 'border-accent text-tx' : 'border-transparent text-mut hover:text-tx'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 py-2 text-sm">
          <Avatar name={user.name} src={user.avatarUrl} />
          <span className="hidden sm:inline">{user.name}</span>
          <Pill tone="info">{user.roleName}</Pill>
          <button className="btn-ghost min-h-9 px-3" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-6 pb-16">
        <Outlet />
      </main>
      {message && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-tx px-4 py-3 text-sm font-semibold text-bg">{message}</div>}
    </div>
  );
}
