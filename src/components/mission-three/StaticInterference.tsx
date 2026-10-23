'use client';

import { useEffect, useState } from 'react';

const STATIC_DURATION_MS = 1600;

const SIGNAL_LINES = [
  'SIGNAL INTERRUPTED',
  'UNAUTHORIZED TRANSMISSION DETECTED',
  'SOURCE: UNKNOWN',
  'ENCRYPTED CHANNEL OVERRIDE',
];

// Full-screen static/glitch takeover shown for ~1.6s immediately
// after the briefing countdown, before the hacker video begins.
// Duration is fixed and owned here via setTimeout -- the parent
// (HackerTransmission) just reacts to onDone, it never guesses at
// timing itself. prefers-reduced-motion disables the CSS animation
// (see globals.css) but the transition still runs on the same
// schedule so the gated flow stays consistent either way.
export default function StaticInterference({
  onDone,
}: {
  onDone: () => void;
}) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const lineTimer = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % SIGNAL_LINES.length);
    }, 420);

    const doneTimer = window.setTimeout(onDone, STATIC_DURATION_MS);

    return () => {
      window.clearInterval(lineTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className="mission3-static" role="presentation" aria-hidden="true">
      <div className="mission3-static__noise" />
      <div className="mission3-static__scanlines" />
      <div
        className="mission3-static__bar"
        style={{ top: '18%', animationDelay: '0s' }}
      />
      <div
        className="mission3-static__bar"
        style={{ top: '52%', animationDelay: '.4s' }}
      />
      <div
        className="mission3-static__bar"
        style={{ top: '77%', animationDelay: '.9s' }}
      />

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <p className="text-center font-mono text-sm font-black uppercase tracking-[0.3em] text-red-500 sm:text-xl">
          {SIGNAL_LINES[lineIndex]}
        </p>
      </div>
    </div>
  );
}
