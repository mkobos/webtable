import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEqTables, mockDeleteTables, mockAdminFrom } = vi.hoisted(() => ({
  mockEqTables: vi.fn(),
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
    mockEqTables.mockReset();
    mockAdminFrom.mockReset();
    mockDeleteTables.mockReturnValue({ eq: mockEqTables });
    mockAdminFrom.mockReturnValue({ delete: mockDeleteTables });
  });

  it('returns 204 on success', async () => {
    mockEqTables.mockResolvedValue({ error: null });

    const response = await DELETE(fakeReq, { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(204);
  });

  it('returns 500 when table delete fails', async () => {
    mockEqTables.mockResolvedValue({ error: { message: 'table error' } });

    const response = await DELETE(fakeReq, { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Failed to delete table' });
  });
});
