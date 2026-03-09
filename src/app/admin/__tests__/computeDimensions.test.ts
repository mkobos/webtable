import { describe, it, expect, vi } from 'vitest';

// admin/page.tsx imports supabase at module level — mock it to avoid needing real credentials
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), channel: vi.fn() },
}));

import { computeDimensions } from '@/app/admin/page';

describe('admin computeDimensions', () => {
  it('returns empty map for empty array', () => {
    const dims = computeDimensions([]);
    expect(dims.size).toBe(0);
  });

  it('maps a single cell to correct row/col counts', () => {
    const dims = computeDimensions([{ table_id: 't1', row: 2, col: 3 }]);
    expect(dims.get('t1')).toEqual({ rows: 3, cols: 4 });
  });

  it('tracks maximum row and col for the same table', () => {
    const dims = computeDimensions([
      { table_id: 't1', row: 0, col: 0 },
      { table_id: 't1', row: 4, col: 2 },
    ]);
    expect(dims.get('t1')).toEqual({ rows: 5, cols: 3 });
  });

  it('tracks two different tables separately', () => {
    const dims = computeDimensions([
      { table_id: 'a', row: 1, col: 1 },
      { table_id: 'b', row: 3, col: 5 },
    ]);
    expect(dims.get('a')).toEqual({ rows: 2, cols: 2 });
    expect(dims.get('b')).toEqual({ rows: 4, cols: 6 });
  });
});
