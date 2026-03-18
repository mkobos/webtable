import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { sha256 } from '@/lib/utils';

const { mockSingle, mockSelect, mockInsert, mockFrom } = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

import { POST } from '@/app/api/tables/route';

function makeReq(cookie?: string) {
  const url = 'http://localhost';
  const headers: Record<string, string> = {};
  if (cookie) headers['cookie'] = cookie;
  return new NextRequest(url, { method: 'POST', headers });
}

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

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 when no admin cookie is provided', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const response = await POST(makeReq());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when admin cookie is invalid', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const response = await POST(makeReq('admin_session=wrong'));
    expect(response.status).toBe(401);
  });

  it('returns 201 with id on success', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const token = await sha256('secret');
    mockSingle.mockResolvedValue({ data: { id: 'uuid-123' }, error: null });

    const response = await POST(makeReq(`admin_session=${token}`));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ id: 'uuid-123' });
  });

  it('returns 201 when ADMIN_PASSWORD is not set (open access)', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '');
    mockSingle.mockResolvedValue({ data: { id: 'uuid-456' }, error: null });

    const response = await POST(makeReq());
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({ id: 'uuid-456' });
  });

  it('returns 500 on DB error', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '');
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const response = await POST(makeReq());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Failed to create table' });
  });
});
