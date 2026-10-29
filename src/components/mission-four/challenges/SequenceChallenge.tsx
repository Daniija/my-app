'use client';

import { useState } from 'react';

import type { SequenceChallenge as Challenge } from '@/lib/missions/mission-four-challenge-engine';

// Keyboard-operable ordering: move an item up/down with buttons
// (no drag-and-drop dependency needed, and it works identically with
// a keyboard or a touch screen).
export default function SequenceChallenge({
  challenge,
  disabled,
  onSubmit,
}: {
  challenge: Challenge;
  disabled: boolean;
  onSubmit: (order: string[]) => void;
}) {
  const [order, setOrder] = useState(() => challenge.items.map((item) => item.id));

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    setOrder((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const labelById = new Map(challenge.items.map((item) => [item.id, item.label]));

  return (
    <div>
      <ol className="space-y-2">
        {order.map((id, index) => (
          <li
            key={id}
            className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0a0608] px-4 py-3 text-sm font-bold"
          >
            <span className="font-mono text-slate-500">{index + 1}</span>
            <span className="flex-1">{labelById.get(id)}</span>

            <div className="flex gap-1">
              <button
                type="button"
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
                aria-label="Move up"
                className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={disabled || index === order.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Move down"
                className="btn btn-secondary px-2 py-1 text-xs disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSubmit(order)}
        className="mt-5 rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Submit
      </button>
    </div>
  );
}
