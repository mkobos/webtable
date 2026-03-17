import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sha256 } from '@/lib/utils';

const { mockEqTables, mockDeleteTables, mockAdminFrom } = vi.hoisted(() => ({
  mockEqTables: vi.fn(),
  mockDeleteTables: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: mockAdminFrom },
}));

import { DELETE } from '@/app/api/tables/[id]/route';

function makeReq(cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers['cookie'] = cookie;
  return new Request('http://localhost', { method: 'DELETE', headers });
}

describe('DELETE /api/tables/[id]', () => {
  beforeEach(() => {
    mockEqTables.mockReset();
    mockDeleteTables.mockReset();
    mockAdminFrom.mockReset();
    mockDeleteTables.mockReturnValue({ eq: mockEqTables });
    mockAdminFrom.mockReturnValue({ delete: mockDeleteTables });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 when no admin cookie is provided', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const response = await DELETE(makeReq(), { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when admin cookie is invalid', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const response = await DELETE(makeReq('admin_session=wrong'), { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(401);
  });

  it('returns 204 on success with valid admin cookie', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const token = await sha256('secret');
    mockEqTables.mockResolvedValue({ error: null });

    const response = await DELETE(makeReq(`admin_session=${token}`), { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(204);
  });

  it('returns 204 when ADMIN_PASSWORD is not set (open access)', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '');
    mockEqTables.mockResolvedValue({ error: null });

    const response = await DELETE(makeReq(), { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(204);
  });

  it('returns 500 when table delete fails', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '');
    mockEqTables.mockResolvedValue({ error: { message: 'table error' } });

    const response = await DELETE(makeReq(), { params: Promise.resolve({ id: 'abc' }) });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Failed to delete table' });
  });
});
