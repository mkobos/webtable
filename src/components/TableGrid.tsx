'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, type CellRow } from '@/lib/supabase';
import Cell from './Cell';

type Props = {
  tableId: string;
  initialCells: CellRow[];
  initialTitle: string;
};

type GridState = Map<string, string>; // key: "row:col", value: cell content

const MIN_ROWS = 5;
const MIN_COLS = 2;
const PADDING = 1; // extra empty rows/cols beyond last used

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

export function buildGrid(cells: CellRow[]): GridState {
  const map: GridState = new Map();
  for (const c of cells) {
    map.set(cellKey(c.row, c.col), c.value);
  }
  return map;
}

export function computeDimensions(grid: GridState) {
  let maxRow = -1;
  let maxCol = -1;
  for (const key of grid.keys()) {
    const [r, c] = key.split(':').map(Number);
    if (grid.get(key)) {
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
    }
  }
  return {
    rows: Math.max(MIN_ROWS, maxRow + 1 + PADDING),
    cols: Math.max(MIN_COLS, maxCol + 1 + PADDING),
  };
}

type FocusRequest = { row: number; col: number; token: number };

export default function TableGrid({ tableId, initialCells, initialTitle }: Props) {
  const [grid, setGrid] = useState<GridState>(() => buildGrid(initialCells));
  const gridRef = useRef<GridState>(grid);
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialTitle);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef<Set<string>>(new Set());

  // Keep gridRef in sync with grid state
  useEffect(() => { gridRef.current = grid; }, [grid]);

  const { rows, cols } = useMemo(() => computeDimensions(grid), [grid]);

  // Subscribe to Supabase Realtime for this table
  useEffect(() => {
    const channel = supabase
      .channel(`table:${tableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cells',
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          const cell = payload.new as CellRow;
          const key = cellKey(cell.row, cell.col);
          // Skip if this client is currently saving this cell (avoid echo)
          if (savingRef.current.has(key)) return;
          setGrid(prev => {
            const next = new Map(prev);
            next.set(key, cell.value);
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tables',
          filter: `id=eq.${tableId}`,
        },
        (payload) => {
          const updated = payload.new as { title: string };
          if (!savingRef.current.has('title')) {
            setTitle(updated.title);
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); supabase.removeChannel(channel); };
  }, [tableId]);

  async function handleTitleSave(value: string) {
    setEditingTitle(false);
    if (value === title) return;
    const previousTitle = title;
    setTitle(value);
    savingRef.current.add('title');
    const { error } = await supabase.from('tables').update({ title: value }).eq('id', tableId);
    savingRef.current.delete('title');
    if (error) {
      setTitle(previousTitle);
      setSaveError('Failed to save title. Please try again.');
    }
  }

  const handleSave = useCallback(async (row: number, col: number, value: string) => {
    const key = cellKey(row, col);
    const previousValue = gridRef.current.get(key) ?? '';
    // Optimistically update local state
    setGrid(prev => { const next = new Map(prev); next.set(key, value); return next; });
    // Mark as saving so we ignore the Realtime echo
    savingRef.current.add(key);
    const { error } = await supabase.from('cells').upsert({
      table_id: tableId,
      row,
      col,
      value,
      updated_at: new Date().toISOString(),
    });
    savingRef.current.delete(key);
    if (error) {
      setGrid(prev => { const next = new Map(prev); next.set(key, previousValue); return next; });
      setSaveError('Failed to save cell. Please try again.');
    }
  }, [tableId]);

  const handleNavigate = useCallback((row: number, col: number, dir: 'right' | 'down') => {
    const nextRow = dir === 'down' ? row + 1 : row;
    const nextCol = dir === 'right' ? col + 1 : col;
    setFocusRequest({ row: nextRow, col: nextCol, token: Date.now() });
  }, []);

  async function copyUrl() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col h-screen">
      {saveError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0 gap-4">
        {/* Editable title */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={() => handleTitleSave(titleDraft)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleTitleSave(titleDraft);
              if (e.key === 'Escape') { setTitleDraft(title); setEditingTitle(false); }
            }}
            placeholder="Untitled table"
            maxLength={100}
            className="flex-1 min-w-0 text-left text-base font-semibold bg-gray-50 border border-gray-300 rounded px-2 py-0.5 outline-none focus:border-blue-500"
          />
        ) : (
          <button
            onClick={() => { setTitleDraft(title); setEditingTitle(true); }}
            className="flex-1 min-w-0 text-left text-base font-semibold truncate hover:bg-gray-100 rounded px-2 py-0.5 transition-colors"
          >
            {title || <span className="text-gray-400 font-normal">Untitled table</span>}
          </button>
        )}

        <button
          onClick={copyUrl}
          className="px-4 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors shrink-0"
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </header>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="border-collapse table-fixed">
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td className={`w-9 min-w-[2.25rem] h-9 text-center text-xs select-none border-r-2 border-gray-300 ${r === 0 ? 'bg-gray-50 border-b-2' : r % 2 === 0 ? 'bg-gray-100 border-b border-gray-200 text-gray-400' : 'border-b border-gray-200 text-gray-400'}`}>
                  {r > 0 ? r : ''}
                </td>
                {Array.from({ length: cols }, (_, c) => (
                  <Cell
                    key={c}
                    row={r}
                    col={c}
                    value={grid.get(cellKey(r, c)) ?? ''}
                    isFirstRow={r === 0}
                    isFirstCol={c === 0}
                    focusToken={focusRequest?.row === r && focusRequest?.col === c ? focusRequest.token : 0}
                    onSave={handleSave}
                    onNavigate={handleNavigate}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
