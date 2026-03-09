'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

async function logout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
}
import { supabase, type TableRow, type CellRow } from '@/lib/supabase';

type TableMeta = TableRow & { rows: number; cols: number };

function computeDimensions(cells: Pick<CellRow, 'table_id' | 'row' | 'col'>[]) {
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

export default function AdminPage() {
  const router = useRouter();
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadTables() {
    const [{ data: tablesData }, { data: cellsData }] = await Promise.all([
      supabase.from('tables').select('id, title, created_at').order('created_at', { ascending: false }),
      supabase.from('cells').select('table_id, row, col'),
    ]);

    const dims = computeDimensions((cellsData ?? []) as Pick<CellRow, 'table_id' | 'row' | 'col'>[]);

    setTables(
      ((tablesData ?? []) as TableRow[]).map(t => ({
        ...t,
        rows: dims.get(t.id)?.rows ?? 0,
        cols: dims.get(t.id)?.cols ?? 0,
      }))
    );
    setLoading(false);
  }

  useEffect(() => { loadTables(); }, []);

  async function handleCreate() {
    setCreating(true);
    const res = await fetch('/api/tables', { method: 'POST' });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/table/${id}`);
    } else {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/tables/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTables(prev => prev.filter(t => t.id !== id));
    }
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Rows</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Cols</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tables.map(t => (
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
