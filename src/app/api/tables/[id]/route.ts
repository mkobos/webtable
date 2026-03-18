import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminSession } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminSession(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { error } = await supabaseAdmin.from('tables').delete().eq('id', id);
  if (error) {
    return Response.json({ error: 'Failed to delete table' }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
