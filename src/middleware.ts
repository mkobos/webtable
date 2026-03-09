import { NextRequest, NextResponse } from 'next/server';
import { sha256 } from '@/lib/utils';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.next(); // no password configured → open access

  const expectedToken = await sha256(password);
  const sessionCookie = request.cookies.get('admin_session')?.value;

  if (sessionCookie !== expectedToken) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
