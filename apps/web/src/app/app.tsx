import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { queryClient } from '../lib/queryClient';
import { useAuthStore } from '../store/auth.store';
import { router } from './routes';

let booting: Promise<void> | null = null;

/** On page load, ask the API "do I still have a valid refresh cookie?" and restore the login. */
function restoreSession() {
  booting ??= fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      useAuthStore.getState().setSession(data.accessToken, data.user);
    })
    .catch(() => undefined)
    .finally(() => useAuthStore.getState().setHydrated());
  return booting;
}

export function App() {
  useEffect(() => {
    void restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
