import { NextRequest, NextResponse } from 'next/server';
import { sha256 } from '@/lib/utils';

export async function POST(request: NextRequest) {
  let password: string;
  try {
    const body = await request.json();
    password = body.password;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = await sha256(adminPassword);
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}
