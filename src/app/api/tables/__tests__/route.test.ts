import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSingle, mockSelect, mockInsert, mockFrom } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}));

import { POST } from '@/app/api/tables/route';

describe('POST /api/tables', () => {
  beforeEach(() => {
    mockSingle.mockReset();
    mockSelect.mockReset();
    mockInsert.mockReset();
    mockFrom.mockReset();
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it('returns 201 with id on success', async () => {
    mockSingle.mockResolvedValue({ data: { id: 'uuid-123' }, error: null });

    const response = await POST();
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ id: 'uuid-123' });
  });

  it('returns 500 on DB error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const response = await POST();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Failed to create table' });
  });
});
