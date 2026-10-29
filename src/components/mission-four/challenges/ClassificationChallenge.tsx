'use client';

import { useState } from 'react';

import type { ClassificationChallenge as Challenge } from '@/lib/missions/mission-four-challenge-engine';

export default function ClassificationChallenge({
  challenge,
  disabled,
  onSubmit,
}: {
  challenge: Challenge;
  disabled: boolean;
  onSubmit: (categoryByItemId: Record<string, string>) => void;
}) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const complete = challenge.items.every((item) => assignments[item.id]);

  return (
    <div>
      <div className="space-y-3">
        {challenge.items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-800 bg-[#0a0608] p-4"
          >
            <p className="text-sm font-bold">{item.label}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {challenge.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setAssignments((current) => ({ ...current, [item.id]: category.id }))
                  }
                  className={
                    assignments[item.id] === category.id
                      ? 'btn btn-primary'
                      : 'btn btn-secondary'
                  }
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled || !complete}
        onClick={() => onSubmit(assignments)}
        className="mt-5 rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Submit
      </button>
    </div>
  );
}
