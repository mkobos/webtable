'use client';

import { memo, useState, useRef, useEffect } from 'react';

type Props = {
  value: string;
  row: number;
  col: number;
  isFirstRow: boolean;
  isFirstCol: boolean;
  focusToken: number; // increment to programmatically focus this cell
  onSave: (row: number, col: number, value: string) => void;
  onNavigate: (row: number, col: number, dir: 'right' | 'down') => void;
};

function cellClassName(isFirstRow: boolean, isFirstCol: boolean, row: number, editing: boolean) {
  const base = 'relative p-0 min-w-[120px] h-9';

  const border = isFirstRow
    ? 'border-gray-300 border-b-2 border-r'
    : `border-gray-200 border-t border-b border-r${isFirstCol ? '' : ' border-l'}`;

  const bg = isFirstRow ? 'bg-gray-50' : row % 2 === 0 ? 'bg-gray-100' : '';

  const interaction = editing ? '' : 'cursor-pointer hover:bg-blue-50';

  return `${base} ${border} ${bg} ${interaction}`;
}

function Cell({ value, row, col, isFirstRow, isFirstCol, focusToken, onSave, onNavigate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Keep draft in sync when external value changes (from Realtime)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Focus this cell when requested by parent
  useEffect(() => {
    if (focusToken > 0) {
      setDraft(valueRef.current);
      setEditing(true);
    }
  }, [focusToken]);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(row, col, draft);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
      onNavigate(row, col, 'down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commit();
      onNavigate(row, col, 'right');
    } else if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
  }

  return (
    <td
      className={cellClassName(isFirstRow, isFirstCol, row, editing)}
      onClick={!editing ? startEdit : undefined}
    >
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          maxLength={10000}
          // text-base (16px) prevents iOS Safari auto-zoom
          className="absolute inset-0 w-full h-full px-2 text-base bg-white border-2 border-blue-500 outline-none"
        />
      ) : (
        <span className={`block px-2 py-1 text-sm truncate ${isFirstRow ? 'font-semibold' : ''}`}>{value}</span>
      )}
    </td>
  );
}

export default memo(Cell);
