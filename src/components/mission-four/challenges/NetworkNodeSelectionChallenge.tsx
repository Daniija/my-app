'use client';

import { useState } from 'react';

import type { NetworkNodeSelectionChallenge as Challenge } from '@/lib/missions/mission-four-challenge-engine';

// Simple node-selection grid rather than a literal network diagram --
// each node lists its connections for context. Fully
// keyboard/touch-operable (plain toggle buttons), no canvas/SVG
// graph library needed for this infrastructure pass.
export default function NetworkNodeSelectionChallenge({
  challenge,
  disabled,
  onSubmit,
}: {
  challenge: Challenge;
  disabled: boolean;
  onSubmit: (nodeIds: string[]) => void;
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

  const labelById = new Map(challenge.nodes.map((node) => [node.id, node.label]));

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {challenge.nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected.has(node.id)}
            onClick={() => toggle(node.id)}
            className={`rounded-lg border p-4 text-left transition ${
              selected.has(node.id)
                ? 'border-red-500 bg-red-950/30'
                : 'border-slate-800 bg-[#0a0608] hover:border-slate-600'
            }`}
          >
            <p className="font-bold">{node.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              Connected to:{' '}
              {node.connections.map((id) => labelById.get(id) ?? id).join(', ') || 'none'}
            </p>
          </button>
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
