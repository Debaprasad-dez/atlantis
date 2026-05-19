import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Admin from './Admin';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/db/schema';
import { BUILTIN_ROLES } from '@/lib/rbac';

const wrap = () => render(<MemoryRouter><Admin /></MemoryRouter>);

beforeEach(async () => {
  useAuthStore.setState({ user: { id: 'admin', name: 'A', email: 'a', roleId: 'role_admin', createdAt: 0 } });
  await db.roles.bulkPut(BUILTIN_ROLES);
});

describe('Admin / role builder', () => {
  it('ADMIN-RB-01: editor shows "NEW ROLE" by default', () => {
    wrap();
    expect(screen.getByText(/NEW ROLE/)).toBeInTheDocument();
  });

  it('ADMIN-RB-02/03/05: SAVE persists the role and writes audit', async () => {
    wrap();
    fireEvent.change(screen.getByPlaceholderText(/Forensic Auditor/), {
      target: { value: 'My Custom Role' },
    });
    // toggle the first permission (View entities)
    fireEvent.click(await screen.findByText('View entities'));
    fireEvent.click(screen.getByText('SAVE'));
    await waitFor(async () => {
      const roles = await db.roles.toArray();
      expect(roles.some((r) => r.name === 'My Custom Role')).toBe(true);
    });
    // audit() is fire-and-forget AND now goes through the hash-chain append
    // (multiple awaits internally), so wait for it explicitly.
    await waitFor(async () => {
      const audit = await db.audit.toArray();
      expect(audit.some((a) => a.action === 'create_role')).toBe(true);
    });
  });

  it('ADMIN-RB-04: system roles have no DEL button', () => {
    wrap();
    // Three EDIT buttons (one per system role), zero DEL buttons before any custom role exists
    expect(screen.getAllByText('EDIT')).toHaveLength(3);
    expect(screen.queryByText('DEL')).toBeNull();
  });
});
