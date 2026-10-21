'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type WorkLocationType = 'hq' | 'branch';

export default function WorkgroupSelectForm({
  departments,
  branches,
}: {
  departments: string[];
  branches: string[];
}) {
  const router = useRouter();

  const [category, setCategory] = useState<WorkLocationType | ''>('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const options = category === 'hq' ? departments : branches;

  function handleCategoryChange(next: string) {
    setCategory(next as WorkLocationType | '');
    setValue('');
    setMessage('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!category || !value) {
      setIsError(true);
      setMessage('Choose a category and an option before continuing.');
      return;
    }

    setBusy(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('/api/workgroup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workLocationType: category, value }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Unable to save your selection (${response.status}).`
        );
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setIsError(true);
      setMessage(
        err instanceof Error ? err.message : 'Unable to save your selection.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="category" className="block text-sm font-bold mb-2">
          Department or Branch?
        </label>

        <select
          id="category"
          required
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
        >
          <option value="" disabled>
            Select one…
          </option>
          <option value="hq">Department</option>
          <option value="branch">Branch</option>
        </select>
      </div>

      {category && (
        <div>
          <label htmlFor="value" className="block text-sm font-bold mb-2">
            {category === 'hq' ? 'Which department?' : 'Which branch?'}
          </label>

          <select
            id="value"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={options.length === 0}
            className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
          >
            <option value="" disabled>
              {options.length === 0 ? 'No options available yet' : 'Select one…'}
            </option>

            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {options.length === 0 && (
            <p className="muted mt-2 text-xs">
              An administrator hasn&apos;t added any {category === 'hq' ? 'departments' : 'branches'} yet. Check back soon.
            </p>
          )}
        </div>
      )}

      <button
        disabled={busy || !category || !value}
        className="btn btn-primary"
        type="submit"
      >
        {busy ? 'Saving…' : 'Confirm selection'}
      </button>

      {message && (
        <p
          role="alert"
          className={`text-sm ${isError ? 'text-[#ffd2d2]' : 'muted'}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
