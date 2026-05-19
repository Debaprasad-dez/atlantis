import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import InvestigationDetail from './InvestigationDetail';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/db/schema';

const CASE_ID = 'CASE001';

const wrap = () =>
  render(
    <MemoryRouter initialEntries={[`/investigations/${CASE_ID}`]}>
      <Routes>
        <Route path="/investigations/:id" element={<InvestigationDetail />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(async () => {
  useAuthStore.setState({
    user: { id: 'u', name: 'Op', email: 'o', roleId: 'role_admin', createdAt: 0 },
  });
  await db.investigations.put({
    id: CASE_ID,
    title: 'Test case',
    status: 'open',
    ownerId: 'u',
    entityIds: ['E1'],
    progress: 10,
    createdAt: 0,
    updatedAt: 0,
  });
  await db.entities.put({
    id: 'E1',
    type: 'person',
    name: 'Alice',
    riskScore: 80,
    tags: [],
    country: 'US',
    attrs: {},
    createdAt: 0,
    updatedAt: 0,
  });
});

describe('InvestigationDetail', () => {
  it('CASE-01: renders title and pinned entity', async () => {
    wrap();
    expect(await screen.findByText('Test case')).toBeInTheDocument();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
  });

  it('CASE-02: changing status persists', async () => {
    wrap();
    fireEvent.click(await screen.findByText('reviewing'));
    await waitFor(async () => {
      const c = await db.investigations.get(CASE_ID);
      expect(c.status).toBe('reviewing');
    });
  });

  it('CASE-03: posting a note writes to caseNotes', async () => {
    wrap();
    const ta = await screen.findByPlaceholderText(/Draft a note/);
    fireEvent.change(ta, { target: { value: 'Found a smurf pattern' } });
    fireEvent.click(screen.getByText(/POST/));
    await waitFor(async () => {
      const notes = await db.caseNotes.where('caseId').equals(CASE_ID).toArray();
      expect(notes.some((n) => n.body.includes('smurf'))).toBe(true);
    });
  });
});
