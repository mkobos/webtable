import { notFound } from 'next/navigation';
import { supabase, type CellRow } from '@/lib/supabase';
import TableGrid from '@/components/TableGrid';

export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Verify the table exists and fetch its title
  const { data: table } = await supabase
    .from('tables')
    .select('id, title')
    .eq('id', id)
    .single();

  if (!table) notFound();

  // Fetch initial cells server-side (no loading spinner on first visit)
  const { data: cells } = await supabase
    .from('cells')
    .select('table_id, row, col, value, updated_at')
    .eq('table_id', id);

  return (
    <TableGrid
      tableId={id}
      initialCells={(cells ?? []) as CellRow[]}
      initialTitle={(table as { title: string }).title ?? ''}
    />
  );
}
