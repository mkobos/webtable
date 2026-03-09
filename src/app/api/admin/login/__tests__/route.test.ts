import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/login/route';

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest(password: string) {
  return new NextRequest('http://localhost/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/admin/login', () => {
  it('returns 200 and sets admin_session cookie on correct password', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const response = await POST(makeRequest('secret'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('admin_session=');
    // Cookie value should be sha256('secret')
    expect(setCookie).toContain('2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b');
  });

  it('returns 401 on wrong password', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const response = await POST(makeRequest('wrong'));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'Invalid password' });
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('returns 401 when ADMIN_PASSWORD is not set', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '');
    const response = await POST(makeRequest('anything'));
    expect(response.status).toBe(401);
  });
});
