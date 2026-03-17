import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sha256 } from '@/lib/utils';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Verify admin session
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    const cookie = req.headers.get('cookie') ?? '';
    const sessionMatch = cookie.match(/admin_session=([^;]+)/);
    const sessionToken = sessionMatch?.[1];
    const expectedToken = await sha256(adminPassword);
    if (sessionToken !== expectedToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { id } = await params;
  const { error } = await supabaseAdmin.from('tables').delete().eq('id', id);
  if (error) {
    return Response.json({ error: 'Failed to delete table' }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
