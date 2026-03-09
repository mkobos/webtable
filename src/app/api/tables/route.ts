import { supabase } from '@/lib/supabase';

export async function POST() {
  const { data, error } = await supabase
    .from('tables')
    .insert({})
    .select('id')
    .single();

  if (error || !data) {
    return Response.json({ error: 'Failed to create table' }, { status: 500 });
  }

  return Response.json({ id: data.id }, { status: 201 });
}
