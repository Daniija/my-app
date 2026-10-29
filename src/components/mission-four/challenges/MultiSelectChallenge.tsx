'use client';

import { useState } from 'react';

import type { MultiSelectChallenge as Challenge } from '@/lib/missions/mission-four-challenge-engine';

export default function MultiSelectChallenge({
  challenge,
  disabled,
  onSubmit,
}: {
  challenge: Challenge;
  disabled: boolean;
  onSubmit: (optionIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="space-y-2">
        {challenge.options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${
              selected.has(option.id)
                ? 'border-red-500 bg-red-950/30'
                : 'border-slate-800 bg-[#0a0608] hover:border-slate-600'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(option.id)}
              disabled={disabled}
              onChange={() => toggle(option.id)}
              className="h-4 w-4"
            />
            {option.label}
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled || selected.size === 0}
        onClick={() => onSubmit(Array.from(selected))}
        className="mt-5 rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Submit
      </button>
    </div>
  );
}
