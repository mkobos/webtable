import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy as middleware, config } from '@/proxy';

afterEach(() => {
  vi.unstubAllEnvs();
});

async function sha256(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function makeRequest(path: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers['cookie'] = cookie;
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe('middleware', () => {
  it('bypasses /admin/login without checking cookie', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const req = makeRequest('/admin/login');
    const res = await middleware(req);
    // Should pass through (not redirect)
    expect(res.status).not.toBe(302);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows access when ADMIN_PASSWORD is not set', async () => {
    vi.stubEnv('ADMIN_PASSWORD', '');
    const req = makeRequest('/admin');
    const res = await middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows access with valid cookie', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const token = await sha256('secret');
    const req = makeRequest('/admin', `admin_session=${token}`);
    const res = await middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects to /admin/login with invalid cookie', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const req = makeRequest('/admin', 'admin_session=wrong');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
    expect(res.headers.get('location')).toContain('from=%2Fadmin');
  });

  it('redirects to /admin/login with no cookie', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret');
    const req = makeRequest('/admin');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
  });
});

describe('middleware config.matcher', () => {
  it('matches /admin', () => {
    expect(config.matcher).toContain('/admin');
  });

  it('matches /admin/:path* pattern', () => {
    expect(config.matcher).toContain('/admin/:path*');
  });
});
