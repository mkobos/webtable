'use client';

import { useState, useRef, useEffect } from 'react';

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

export default function Cell({ value, row, col, isFirstRow, isFirstCol, focusToken, onSave, onNavigate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when external value changes (from Realtime)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Focus this cell when requested by parent
  useEffect(() => {
    if (focusToken > 0) {
      setDraft(value);
      setEditing(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const borderClasses = [
    isFirstRow ? 'border-gray-300' : 'border-gray-200',
    isFirstRow ? '' : 'border-t',
    isFirstCol ? '' : 'border-l',
    isFirstRow ? 'border-b-2 border-r' : 'border-b border-r',
  ].join(' ');

  return (
    <td
      className={`relative p-0 min-w-[120px] h-9 ${borderClasses} ${isFirstRow ? 'bg-gray-50' : row % 2 === 0 ? 'bg-gray-100' : ''} ${!editing ? 'cursor-pointer hover:bg-blue-50' : ''}`}
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
          // text-base (16px) prevents iOS Safari auto-zoom
          className="absolute inset-0 w-full h-full px-2 text-base bg-white border-2 border-blue-500 outline-none"
        />
      ) : (
        <span className={`block px-2 py-1 text-sm truncate ${isFirstRow ? 'font-semibold' : ''}`}>{value}</span>
      )}
    </td>
  );
}
