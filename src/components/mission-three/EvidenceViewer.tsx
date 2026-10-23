'use client';

import { useState, type ReactNode } from 'react';

import TrustStatus, { type TrustStatusLevel } from './TrustStatus';

export type EvidenceClue = {
  id: string;
  label: string;
};

// Shared "case file" chrome for the Video, Voice and Email evidence
// stages: a header strip (case ID / timestamp / sender), a slot for
// the stage-specific media (video player, voice waveform, email
// client), and a reveal-on-demand inspection panel listing the
// investigative clues for that piece of evidence. The clues are
// stated findings the player uncovers by inspecting, not something
// they classify themselves -- the decision below is what's scored.
export default function EvidenceViewer({
  caseId,
  timestamp,
  senderLabel,
  sourceStatus,
  verificationStatus,
  clues,
  media,
  children,
}: {
  caseId: string;
  timestamp: string;
  senderLabel: string;
  sourceStatus: TrustStatusLevel;
  verificationStatus: TrustStatusLevel;
  clues: EvidenceClue[];
  media: ReactNode;
  children: ReactNode;
}) {
  const [inspected, setInspected] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-red-950 bg-[#0b0407]">
      {/* CASE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-red-950 bg-[#140a0d] px-6 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Case ID
          </p>
          <p className="font-mono text-sm font-bold text-red-300">
            {caseId}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Timestamp
          </p>
          <p className="font-mono text-sm font-bold">{timestamp}</p>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Sender Identity
          </p>
          <p className="text-sm font-bold">{senderLabel}</p>
        </div>

        <div className="flex gap-2">
          <div>
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
              Source
            </p>
            <TrustStatus level={sourceStatus} size="sm" />
          </div>

          <div>
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
              Verification
            </p>
            <TrustStatus level={verificationStatus} size="sm" />
          </div>
        </div>
      </div>

      {/* MEDIA */}
      <div className="p-6 sm:p-8">{media}</div>

      {/* INSPECTION PANEL */}
      <div className="border-t border-red-950 px-6 py-5 sm:px-8">
        <button
          type="button"
          onClick={() => setInspected((v) => !v)}
          className="rounded-lg border border-amber-700 bg-amber-950/20 px-4 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-950/40"
        >
          {inspected ? 'Hide Inspection' : 'Inspect Evidence'}
        </button>

        {inspected && (
          <ul className="mt-4 space-y-2">
            {clues.map((clue) => (
              <li
                key={clue.id}
                className="flex items-start gap-2 rounded-lg border border-slate-800 bg-[#0a0608] px-4 py-3 text-sm text-slate-300"
              >
                <span className="mt-0.5 text-amber-400">⚠</span>
                <span>{clue.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* DECISION */}
      <div className="border-t border-red-950 bg-[#0d0609] p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
