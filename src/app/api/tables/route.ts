import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('tables')
    .insert({})
    .select('id')
    .single();

  if (error || !data) {
    return Response.json({ error: 'Failed to create table' }, { status: 500 });
  }

  return Response.json({ id: data.id }, { status: 201 });
}
