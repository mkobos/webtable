import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEqCells, mockEqTables, mockDeleteCells, mockDeleteTables, mockAdminFrom } = vi.hoisted(() => ({
  mockEqCells: vi.fn(),
  mockEqTables: vi.fn(),
  mockDeleteCells: vi.fn(),
  mockDeleteTables: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: mockAdminFrom },
}));

import { DELETE } from '@/app/api/tables/[id]/route';

const fakeReq = new Request('http://localhost');

describe('DELETE /api/tables/[id]', () => {
  beforeEach(() => {
    mockEqCells.mockReset();
    mockEqTables.mockReset();
    mockAdminFrom.mockReset();
    mockDeleteCells.mockReturnValue({ eq: mockEqCells });
    mockDeleteTables.mockReturnValue({ eq: mockEqTables });
    // First call → cells table, second call → tables table
    mockAdminFrom
      .mockReturnValueOnce({ delete: mockDeleteCells })
      .mockReturnValueOnce({ delete: mockDeleteTables });
  });

  it('returns 204 on success', async () => {
    mockEqCells.mockResolvedValue({ error: null });
    mockEqTables.mockResolvedValue({ error: null });

    const response = await DELETE(fakeReq, { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(204);
  });

  it('returns 500 when cells delete fails', async () => {
    mockEqCells.mockResolvedValue({ error: { message: 'cells error' } });

    const response = await DELETE(fakeReq, { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Failed to delete table cells' });
  });

  it('returns 500 when table delete fails', async () => {
    mockEqCells.mockResolvedValue({ error: null });
    mockEqTables.mockResolvedValue({ error: { message: 'table error' } });

    const response = await DELETE(fakeReq, { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Failed to delete table' });
  });
});
