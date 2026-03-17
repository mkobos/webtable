'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type TableRow, type CellRow } from '@/lib/supabase';
import { computeTableDimensions, sortTables, type TableMeta, type SortKey, type SortDir } from '@/lib/gridUtils';

async function logout() {
  const res = await fetch('/api/admin/logout', { method: 'POST' });
  if (res.ok) {
    window.location.href = '/admin/login';
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function AdminPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  async function loadTables() {
    const [{ data: tablesData, error: tablesError }, { data: cellsData, error: cellsError }] = await Promise.all([
      supabase.from('tables').select('id, title, created_at').order('created_at', { ascending: false }),
      supabase.from('cells').select('table_id, row, col, updated_at'),
    ]);

    if (tablesError || cellsError) {
      setError('Failed to load tables.');
      setLoading(false);
      return;
    }

    const dims = computeTableDimensions(cellsData as Pick<CellRow, 'table_id' | 'row' | 'col'>[]);

    const lastEdits = new Map<string, string>();
    for (const c of cellsData as Pick<CellRow, 'table_id' | 'updated_at'>[]) {
      const prev = lastEdits.get(c.table_id);
      if (!prev || c.updated_at > prev) lastEdits.set(c.table_id, c.updated_at);
    }

    setTables(
      (tablesData as TableRow[]).map(t => ({
        ...t,
        rows: dims.get(t.id)?.rows ?? 0,
        cols: dims.get(t.id)?.cols ?? 0,
        lastEdit: lastEdits.get(t.id) ?? null,
      }))
    );
    setLoading(false);
  }

  useEffect(() => { loadTables(); }, []);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    const res = await fetch('/api/tables', { method: 'POST' });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/table/${id}`);
    } else {
      setCreating(false);
      setError('Failed to create table. Please try again.');
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTables(prev => prev.filter(t => t.id !== id));
    } else {
      setError('Failed to delete table. Please try again.');
    }
    setDeletingId(null);
  }

  const sortedTables = sortTables(tables, sortKey, sortDir);

  const thClass = (key: SortKey, align: 'left' | 'right' = 'left') =>
    `px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 ${align === 'right' ? 'text-right' : 'text-left'}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
          </div>
        )}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Admin</h1>
          <div className="flex gap-2">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {creating ? 'Creating…' : 'New table'}
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
          >
            Log out
          </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : tables.length === 0 ? (
          <p className="text-gray-400 text-sm">No tables yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={thClass('title')} onClick={() => handleSort('title')}>
                    Name <SortIcon active={sortKey === 'title'} dir={sortDir} />
                  </th>
                  <th className={thClass('rows', 'right')} onClick={() => handleSort('rows')}>
                    Rows <SortIcon active={sortKey === 'rows'} dir={sortDir} />
                  </th>
                  <th className={thClass('cols', 'right')} onClick={() => handleSort('cols')}>
                    Cols <SortIcon active={sortKey === 'cols'} dir={sortDir} />
                  </th>
                  <th className={thClass('created_at')} onClick={() => handleSort('created_at')}>
                    Created <SortIcon active={sortKey === 'created_at'} dir={sortDir} />
                  </th>
                  <th className={thClass('lastEdit')} onClick={() => handleSort('lastEdit')}>
                    Last edit <SortIcon active={sortKey === 'lastEdit'} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedTables.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a
                        href={`/table/${t.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {t.title || <span className="text-gray-400 font-normal">Untitled</span>}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{t.rows}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{t.cols}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {t.lastEdit ? new Date(t.lastEdit).toLocaleString() : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="text-red-500 hover:text-red-700 disabled:text-red-300 text-xs font-medium transition-colors"
                      >
                        {deletingId === t.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
