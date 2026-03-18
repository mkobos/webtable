import type { CellRow, TableRow } from '@/lib/supabase';

// TableMeta extends TableRow with computed fields (rows, cols, lastEdit) derived from cell stats.
// TableRow is kept for raw DB fetches where these computed fields don't exist yet.
export type TableMeta = TableRow & { rows: number; cols: number; lastEdit: string | null };
export type SortKey = 'title' | 'rows' | 'cols' | 'created_at' | 'lastEdit';
export type SortDir = 'asc' | 'desc';

export function computeTableDimensions(cells: Pick<CellRow, 'table_id' | 'row' | 'col'>[]) {
  const dims = new Map<string, { rows: number; cols: number }>();
  for (const c of cells) {
    const prev = dims.get(c.table_id) ?? { rows: 0, cols: 0 };
    dims.set(c.table_id, {
      rows: Math.max(prev.rows, c.row + 1),
      cols: Math.max(prev.cols, c.col + 1),
    });
  }
  return dims;
}

export function sortTables(tables: TableMeta[], key: SortKey, dir: SortDir): TableMeta[] {
  return [...tables].sort((a, b) => {
    const rawA = a[key];
    const rawB = b[key];
    // nulls always sort last regardless of direction
    if (rawA === null && rawB === null) return 0;
    if (rawA === null) return 1;
    if (rawB === null) return -1;
    let av: string | number = rawA;
    let bv: string | number = rawB;
    if (typeof av === 'string' && typeof bv === 'string') {
      av = av.toLowerCase();
      bv = bv.toLowerCase();
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === 'asc' ? cmp : -cmp;
  });
}
