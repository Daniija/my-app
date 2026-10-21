'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Option = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminOrgOptions({
  type,
  title,
  options,
}: {
  type: 'department' | 'branch';
  title: string;
  options: Option[];
}) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function addOption(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    setAdding(true);
    setError('');

    try {
      const response = await fetch('/api/admin/org-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action: 'add', name: trimmed }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to add that option.');
      }

      setName('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add that option.');
    } finally {
      setAdding(false);
    }
  }

  async function removeOption(id: string, optionName: string) {
    if (!window.confirm(`Remove "${optionName}" from the ${type} list?`)) {
      return;
    }

    setBusyId(id);
    setError('');

    try {
      const response = await fetch('/api/admin/org-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action: 'remove', id }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to remove that option.');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove that option.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-xl font-black">{title}</h2>

      <form onSubmit={addOption} className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder={`Add a ${type}…`}
          className="flex-1 rounded-xl border border-[var(--line)] bg-[#07141d] p-2.5 text-sm"
        />

        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="btn btn-primary"
        >
          {adding ? 'Adding…' : 'Add'}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[#ffd2d2]">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {options.length === 0 && (
          <li className="muted text-sm">No {type}s added yet.</li>
        )}

        {options.map((option) => (
          <li
            key={option.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[#07141d] px-3 py-2"
          >
            <span className="text-sm font-bold">{option.name}</span>

            <button
              type="button"
              disabled={busyId === option.id}
              onClick={() => removeOption(option.id, option.name)}
              className="btn btn-secondary text-xs"
            >
              {busyId === option.id ? 'Removing…' : 'Remove'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
