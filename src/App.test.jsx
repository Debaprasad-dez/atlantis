import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/db/schema';

beforeEach(() => {
  useAuthStore.setState({ user: null });
  // BrowserRouter uses basename="/atlantis"; jsdom must start inside that prefix
  // or the router renders nothing. Reset to the basename root between tests so a
  // prior <Navigate to="/login"> doesn't leak into the next test.
  window.history.replaceState({}, '', '/atlantis/');
});

describe('App routing', () => {
  it('APP-RT-01: unauthenticated users land on /login', async () => {
    // Mark seeded inside the test so it runs AFTER the global table-clear hook.
    await db.meta.put({ key: 'seeded', value: true, at: 0 });
    render(<App />);
    expect(await screen.findByText(/SIGN-IN/i)).toBeInTheDocument();
  });

  it(
    'APP-RT-02: authenticated user sees the Dashboard at /',
    async () => {
      await db.meta.put({ key: 'seeded', value: true, at: 0 });
      useAuthStore.setState({
        user: { id: 'u', name: 'Op', email: 'op', roleId: 'role_admin', createdAt: 0 },
      });
      render(<App />);
      await waitFor(() => expect(screen.getByText('TRANSACTIONS · LAST 24H')).toBeInTheDocument(), {
        timeout: 8000,
      });
    },
    15000,
  );
});
