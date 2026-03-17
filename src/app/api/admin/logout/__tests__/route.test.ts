import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/admin/logout/route';

describe('POST /api/admin/logout', () => {
  it('returns ok:true and clears admin_session cookie', async () => {
    const response = await POST();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('admin_session=');
    expect(setCookie).toContain('Max-Age=0');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie?.toLowerCase()).toContain('samesite=lax');
  });
});
