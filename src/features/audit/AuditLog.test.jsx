import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuditLog from './AuditLog';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/db/schema';
import { BUILTIN_ROLES } from '@/lib/rbac';

beforeEach(async () => {
  await db.roles.bulkPut(BUILTIN_ROLES);
  useAuthStore.setState({
    user: { id: 'u', name: 'Op', email: 'o', roleId: 'role_admin', createdAt: 0 },
  });
  const now = Date.now();
  await db.audit.bulkPut([
    { userId: 'u', action: 'login', target: null, details: null, ts: now - 1000 },
    { userId: 'u', action: 'view_entity', target: 'E1', details: null, ts: now - 2000 },
    { userId: 'u', action: 'run_query', target: null, details: { q: 'risk:>80' }, ts: now - 3000 },
  ]);
});

describe('AuditLog', () => {
  it('AUD-LOG-01: renders header and row count', async () => {
    render(<MemoryRouter><AuditLog /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/AUDIT LOG/)).toBeInTheDocument());
    expect(await screen.findByText(/3 rows/)).toBeInTheDocument();
  });

  it('AUD-LOG-02: filtering by action narrows results', async () => {
    render(<MemoryRouter><AuditLog /></MemoryRouter>);
    fireEvent.click(await screen.findByText('login'));
    await waitFor(() => expect(screen.getByText(/1 rows/)).toBeInTheDocument());
  });

  it('AUD-LOG-03: export button visible for admins', async () => {
    render(<MemoryRouter><AuditLog /></MemoryRouter>);
    expect(await screen.findByText('EXPORT CSV')).toBeInTheDocument();
  });
});
