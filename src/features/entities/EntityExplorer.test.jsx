import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EntityExplorer from './EntityExplorer';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/db/schema';
import { BUILTIN_ROLES } from '@/lib/rbac';

const wrap = () => render(<MemoryRouter><EntityExplorer /></MemoryRouter>);

beforeEach(async () => {
  await db.roles.bulkPut(BUILTIN_ROLES);
  useAuthStore.setState({
    user: { id: 'u', name: 'Op', email: 'op', roleId: 'role_admin', createdAt: 0 },
  });
  await db.entities.bulkPut([
    { id: 'E1', type: 'person', name: 'Alice', riskScore: 30, tags: ['kyc-verified'], country: 'US', attrs: {}, createdAt: 0, updatedAt: 0 },
    { id: 'E2', type: 'person', name: 'Bob', riskScore: 92, tags: ['sanctioned'], country: 'RU', attrs: {}, createdAt: 0, updatedAt: 0 },
    { id: 'E3', type: 'account', name: 'Acct-9', riskScore: 60, tags: [], country: 'CH', attrs: { balance: 1000, currency: 'USD' }, createdAt: 0, updatedAt: 0 },
  ]);
});

describe('EntityExplorer (Phase 2 — chip query)', () => {
  it('ENT-EX-01: renders quick facets and saved-queries sidebar', async () => {
    wrap();
    expect(await screen.findByText('QUICK FACETS')).toBeInTheDocument();
    expect(screen.getByText('SAVED QUERIES')).toBeInTheDocument();
    expect(screen.getByText(/High risk/)).toBeInTheDocument();
  });

  it('ENT-EX-02: clicking a row opens the inspector and audits', async () => {
    wrap();
    await waitFor(() => expect(screen.queryByText('Bob')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Bob'));
    await waitFor(async () => {
      const a = await db.audit.toArray();
      expect(a.some((r) => r.action === 'view_entity' && r.target === 'E2')).toBe(true);
    });
  });

  it('ENT-EX-03: chip query input accepts a clause', async () => {
    wrap();
    const input = await screen.findByPlaceholderText(/type:person/);
    fireEvent.change(input, { target: { value: 'type:account' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // After commit, a chip with field "type" shows
    await waitFor(() => expect(screen.getByText('type')).toBeInTheDocument());
  });

  it('ENT-EX-04: clicking a quick-facet button appends to the query', async () => {
    wrap();
    fireEvent.click(await screen.findByText(/High risk/));
    // The "risk" chip from "risk:>80" should appear
    await waitFor(() => expect(screen.getByText('risk')).toBeInTheDocument());
  });
});
