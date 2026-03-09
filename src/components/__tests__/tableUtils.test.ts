import { describe, it, expect, vi } from 'vitest';

// TableGrid.tsx imports supabase at module level — mock it to avoid needing real credentials
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), channel: vi.fn() },
}));

import { buildGrid, computeDimensions } from '@/components/TableGrid';

describe('buildGrid', () => {
  it('returns empty map for empty array', () => {
    const grid = buildGrid([]);
    expect(grid.size).toBe(0);
  });

  it('maps a single cell correctly', () => {
    const grid = buildGrid([{ table_id: 't1', row: 0, col: 0, value: 'hello', updated_at: '' }]);
    expect(grid.get('0:0')).toBe('hello');
    expect(grid.size).toBe(1);
  });

  it('handles sparse cells at high row/col', () => {
    const grid = buildGrid([{ table_id: 't1', row: 10, col: 20, value: 'Z', updated_at: '' }]);
    expect(grid.get('10:20')).toBe('Z');
    expect(grid.size).toBe(1);
  });

  it('maps multiple cells', () => {
    const cells = [
      { table_id: 't1', row: 0, col: 0, value: 'A', updated_at: '' },
      { table_id: 't1', row: 1, col: 2, value: 'B', updated_at: '' },
      { table_id: 't1', row: 3, col: 1, value: 'C', updated_at: '' },
    ];
    const grid = buildGrid(cells);
    expect(grid.get('0:0')).toBe('A');
    expect(grid.get('1:2')).toBe('B');
    expect(grid.get('3:1')).toBe('C');
    expect(grid.size).toBe(3);
  });
});

describe('computeDimensions', () => {
  // MIN_ROWS=5, MIN_COLS=2, PADDING=1

  it('returns minimums for an empty grid', () => {
    const grid = new Map<string, string>();
    expect(computeDimensions(grid)).toEqual({ rows: 5, cols: 2 });
  });

  it('returns minimums when single cell at 0:0 (minimums dominate)', () => {
    const grid = new Map([['0:0', 'x']]);
    // row: max(5, 0+1+1) = max(5,2) = 5, col: max(2, 0+1+1) = max(2,2) = 2
    expect(computeDimensions(grid)).toEqual({ rows: 5, cols: 2 });
  });

  it('adds PADDING beyond last used cell', () => {
    const grid = new Map([['4:1', 'x']]);
    // row: max(5, 4+1+1) = 6, col: max(2, 1+1+1) = 3
    expect(computeDimensions(grid)).toEqual({ rows: 6, cols: 3 });
  });

  it('handles large row/col values', () => {
    const grid = new Map([['10:7', 'x']]);
    // row: max(5, 10+1+1) = 12, col: max(2, 7+1+1) = 9
    expect(computeDimensions(grid)).toEqual({ rows: 12, cols: 9 });
  });

  it('ignores empty string values when computing dimensions', () => {
    const grid = new Map([
      ['10:7', ''],
      ['2:1', 'x'],
    ]);
    // empty string at 10:7 is falsy, so it should not count
    // row: max(5, 2+1+1) = 5, col: max(2, 1+1+1) = 3
    expect(computeDimensions(grid)).toEqual({ rows: 5, cols: 3 });
  });

  it('uses the maximum row and col across all non-empty cells', () => {
    const grid = new Map([
      ['0:5', 'a'],
      ['3:0', 'b'],
    ]);
    // row: max(5, 3+1+1)=5, col: max(2, 5+1+1)=7
    expect(computeDimensions(grid)).toEqual({ rows: 5, cols: 7 });
  });
});
