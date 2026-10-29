'use client';

import { useState } from 'react';

import type { PasscodeEntryChallenge as Challenge } from '@/lib/missions/mission-four-challenge-engine';

export default function PasscodeEntryChallenge({
  challenge,
  disabled,
  onSubmit,
}: {
  challenge: Challenge;
  disabled: boolean;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState('');

  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">{challenge.hint}</p>

      <label htmlFor={`passcode-${challenge.id}`} className="sr-only">
        Enter the passcode
      </label>
      <input
        id={`passcode-${challenge.id}`}
        type="text"
        value={code}
        disabled={disabled}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter passcode"
        className="w-full rounded-lg border border-slate-800 bg-[#0a0608] px-4 py-3 font-mono text-lg tracking-widest text-white placeholder:text-slate-600"
      />

      <button
        type="button"
        disabled={disabled || code.trim().length === 0}
        onClick={() => onSubmit(code)}
        className="mt-5 rounded-lg bg-red-500 px-6 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Submit
      </button>
    </div>
  );
}
