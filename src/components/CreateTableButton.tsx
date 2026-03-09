'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateTableButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/tables', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const { id } = await res.json();
      router.push(`/table/${id}`);
    } catch {
      setLoading(false);
      alert('Could not create table. Please try again.');
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-lg font-semibold rounded-xl shadow transition-colors"
    >
      {loading ? 'Creating…' : 'Create new table'}
    </button>
  );
}
