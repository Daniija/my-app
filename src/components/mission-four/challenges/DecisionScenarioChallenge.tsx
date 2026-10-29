'use client';

import { useState } from 'react';

import type { DecisionScenarioChallenge as Challenge } from '@/lib/missions/mission-four-challenge-engine';

export default function DecisionScenarioChallenge({
  challenge,
  disabled,
  onSubmit,
}: {
  challenge: Challenge;
  disabled: boolean;
  onSubmit: (optionId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <p className="mb-4 rounded-lg border border-slate-800 bg-[#0a0608] p-4 text-sm leading-6 text-slate-300">
        {challenge.scenario}
      </p>

      <div className="space-y-2">
        {challenge.options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${
              selected === option.id
                ? 'border-red-500 bg-red-950/30'
                : 'border-slate-800 bg-[#0a0608] hover:border-slate-600'
            }`}
          >
            <input
              type="radio"
              name={`decision-${challenge.id}`}
              value={option.id}
              checked={selected === option.id}
              disabled={disabled}
              onChange={() => setSelected(option.id)}
              className="h-4 w-4"
            />
            {option.label}
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled || !selected}
        onClick={() => selected && onSubmit(selected)}
        className="mt-5 rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Submit
      </button>
    </div>
  );
}
