import { NextRequest } from 'next/server';
import { sha256 } from '@/lib/utils';

export async function verifyAdminSession(req: NextRequest): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true;
  const sessionToken = req.cookies.get('admin_session')?.value;
  const expectedToken = await sha256(adminPassword);
  return sessionToken === expectedToken;
}
