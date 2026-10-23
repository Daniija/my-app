'use client';

import { useState } from 'react';

// Renders the real <video>/<audio> element against a configurable
// asset path. If the file hasn't been dropped into /public yet (or
// fails to load for any reason), falls back to a placeholder instead
// of a broken player -- the page must still build and look correct
// with no media files present.
export default function MediaPlaceholder({
  kind,
  src,
  posterLabel,
}: {
  kind: 'video' | 'audio';
  src: string;
  posterLabel: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#0a0608] p-10 text-center">
        <p className="text-4xl">{kind === 'video' ? '\u{1F3AC}' : '\u{1F399}️'}</p>

        <p className="mt-3 text-sm font-bold text-slate-400">
          {posterLabel}
        </p>

        <p className="mt-1 text-xs text-slate-600">
          Media asset not yet available — drop the file at{' '}
          <code className="text-slate-500">{src}</code>
        </p>
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <video
        controls
        preload="none"
        className="w-full rounded-xl border border-slate-800 bg-black"
        onError={() => setFailed(true)}
      >
        <source src={src} />
      </video>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0a0608] p-4">
      <p className="mb-3 text-sm font-bold text-slate-400">{posterLabel}</p>

      <audio
        controls
        preload="none"
        className="w-full"
        onError={() => setFailed(true)}
      >
        <source src={src} />
      </audio>
    </div>
  );
}
