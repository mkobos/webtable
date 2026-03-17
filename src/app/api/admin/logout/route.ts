import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
