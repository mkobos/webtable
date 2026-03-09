import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from('tables').delete().eq('id', id);
  if (error) {
    return Response.json({ error: 'Failed to delete table' }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
