import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/db/schema';
import { BUILTIN_ROLES } from '@/lib/rbac';

const wrap = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  useAuthStore.setState({ user: null });
});

describe('Login', () => {
  it('AUTH-LG-01: renders operator name input', () => {
    wrap();
    expect(screen.getByText(/OPERATOR NAME/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Operator')).toBeInTheDocument();
  });

  it('AUTH-LG-02: lists all 3 built-in roles with perm counts', async () => {
    wrap();
    for (const r of BUILTIN_ROLES) {
      expect(await screen.findByText(r.name)).toBeInTheDocument();
      expect(screen.getByText(`${r.permissions.length} perm`)).toBeInTheDocument();
    }
  });

  it('AUTH-LG-03: submitting logs the user in', async () => {
    wrap();
    fireEvent.click(screen.getByText('ENTER →'));
    await waitFor(() => expect(useAuthStore.getState().user).not.toBeNull());
    expect(useAuthStore.getState().user.name).toBe('Operator');
  });

  it('AUTH-LG-04: custom role appears in the list', async () => {
    await db.roles.bulkPut([
      ...BUILTIN_ROLES,
      {
        id: 'role_custom',
        name: 'Forensic Auditor',
        description: 'read all',
        permissions: ['view_entities'],
        system: false,
      },
    ]);
    wrap();
    expect(await screen.findByText('Forensic Auditor')).toBeInTheDocument();
  });

  it('AUTH-LG-05: writes a login audit row', async () => {
    wrap();
    fireEvent.click(screen.getByText('ENTER →'));
    await waitFor(async () => {
      const rows = await db.audit.toArray();
      expect(rows.some((r) => r.action === 'login')).toBe(true);
    });
  });
});
