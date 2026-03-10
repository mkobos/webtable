import { describe, it, expect, vi } from 'vitest';

// admin/page.tsx imports supabase at module level — mock it to avoid needing real credentials
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), channel: vi.fn() },
}));

import { computeDimensions, sortTables } from '@/app/admin/page';

const makeTable = (overrides: object) => ({
  id: 'x',
  title: 'T',
  created_at: '2024-01-01T00:00:00Z',
  rows: 0,
  cols: 0,
  lastEdit: null,
  ...overrides,
});

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

describe('sortTables', () => {
  const a = makeTable({ id: 'a', title: 'Alpha', rows: 3, cols: 1, created_at: '2024-01-01T00:00:00Z', lastEdit: '2024-03-01T00:00:00Z' });
  const b = makeTable({ id: 'b', title: 'beta',  rows: 1, cols: 5, created_at: '2024-02-01T00:00:00Z', lastEdit: '2024-01-15T00:00:00Z' });
  const c = makeTable({ id: 'c', title: 'Gamma', rows: 5, cols: 2, created_at: '2024-03-01T00:00:00Z', lastEdit: null });

  it('sorts by title ascending (case-insensitive)', () => {
    const result = sortTables([c, b, a], 'title', 'asc');
    expect(result.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by title descending', () => {
    const result = sortTables([a, b, c], 'title', 'desc');
    expect(result.map(t => t.id)).toEqual(['c', 'b', 'a']);
  });

  it('sorts by rows ascending', () => {
    const result = sortTables([c, a, b], 'rows', 'asc');
    expect(result.map(t => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by cols descending', () => {
    const result = sortTables([a, b, c], 'cols', 'desc');
    expect(result.map(t => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by created_at ascending', () => {
    const result = sortTables([c, b, a], 'created_at', 'asc');
    expect(result.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by created_at descending', () => {
    const result = sortTables([a, b, c], 'created_at', 'desc');
    expect(result.map(t => t.id)).toEqual(['c', 'b', 'a']);
  });

  it('sorts by lastEdit ascending, null sorts last', () => {
    const result = sortTables([a, c, b], 'lastEdit', 'asc');
    expect(result.map(t => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by lastEdit descending, null sorts last', () => {
    const result = sortTables([b, c, a], 'lastEdit', 'desc');
    expect(result.map(t => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const input = [c, a, b];
    sortTables(input, 'title', 'asc');
    expect(input.map(t => t.id)).toEqual(['c', 'a', 'b']);
  });
});
