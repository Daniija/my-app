'use client';

import { useState } from 'react';

import type { EvidenceSelectionChallenge as Challenge } from '@/lib/missions/mission-four-challenge-engine';

export default function EvidenceSelectionChallenge({
  challenge,
  disabled,
  onSubmit,
}: {
  challenge: Challenge;
  disabled: boolean;
  onSubmit: (evidenceIds: string[]) => void;
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
        {challenge.evidenceItems.map((item) => (
          <label
            key={item.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition ${
              selected.has(item.id)
                ? 'border-red-500 bg-red-950/30'
                : 'border-slate-800 bg-[#0a0608] hover:border-slate-600'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              disabled={disabled}
              onChange={() => toggle(item.id)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block font-bold">{item.label}</span>
              <span className="mt-1 block text-slate-400">{item.content}</span>
            </span>
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
