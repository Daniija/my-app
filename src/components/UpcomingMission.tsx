'use client';

import { useEffect, useState } from 'react';

type MissionLite = {
  id: number;
  sequence: number;
  title: string;
  unlock_at: string;
  status: string;
  finale: boolean;
};

// Formats the Friday release moment in Jamaica time, e.g.
// "Friday, 24 October 2025 at 5:00 PM".
function formatReleaseDate(unlockAt: string) {
  return new Date(unlockAt).toLocaleString('en-JM', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Jamaica',
  });
}

// Splits a remaining-millisecond span into zero-padded
// days / hours / minutes / seconds for the segmented clock display.
function splitCountdown(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));

  const pad = (value: number) => String(value).padStart(2, '0');

  return {
    days: pad(Math.floor(totalSeconds / 86400)),
    hours: pad(Math.floor((totalSeconds % 86400) / 3600)),
    minutes: pad(Math.floor((totalSeconds % 3600) / 60)),
    seconds: pad(totalSeconds % 60),
  };
}

// A live DD : HH : MM : SS clock, always showing all four units so the
// countdown reads the same whether a mission unlocks in five minutes or
// five days.
function CountdownClock({
  remainingMs,
  size = 'lg',
}: {
  remainingMs: number;
  size?: 'lg' | 'sm';
}) {
  const { days, hours, minutes, seconds } = splitCountdown(remainingMs);

  const units = [
    { label: 'Days', value: days },
    { label: 'Hrs', value: hours },
    { label: 'Min', value: minutes },
    { label: 'Sec', value: seconds },
  ];

  const digitClass =
    size === 'lg'
      ? 'text-3xl sm:text-4xl'
      : 'text-xl';

  return (
    <div className="flex gap-1.5 sm:gap-2">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="min-w-[3rem] rounded-lg border border-[var(--line)] bg-black/30 px-1.5 py-1.5 text-center sm:min-w-[3.5rem] sm:px-2"
        >
          <p
            className={`font-mono font-black tabular-nums text-[var(--accent)] ${digitClass}`}
          >
            {unit.value}
          </p>

          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--muted)] sm:text-[10px]">
            {unit.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function UpcomingMission({
  missions,
  serverNow,
}: {
  missions: MissionLite[];
  serverNow: string;
}) {
  // Seed the clock from the server timestamp so the first client render
  // matches the server-rendered markup, then take over with the real
  // browser clock on mount. The interval is what makes the card roll
  // forward to the next mission the moment a Friday release passes.
  const [now, setNow] = useState(() => new Date(serverNow).getTime());

  useEffect(() => {
    // The first tick (one second in) swaps the server seed for the real
    // browser clock; every tick after keeps the countdown moving and rolls
    // the card forward once a Friday release passes.
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const sorted = [...missions].sort(
    (a, b) =>
      new Date(a.unlock_at).getTime() - new Date(b.unlock_at).getTime()
  );

  // The current week's mission is the most recently unlocked one. Because
  // the clock ticks each second, this rolls over to the next mission the
  // moment its Friday release time passes — so the homepage features a new
  // mission every week.
  const unlocked = sorted.filter(
    (mission) => new Date(mission.unlock_at).getTime() <= now
  );

  const current =
    unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;

  const next = sorted.find(
    (mission) => new Date(mission.unlock_at).getTime() > now
  );

  // Before the first Friday no mission has unlocked yet, so preview the
  // opening mission with a countdown to its release.
  if (!current) {
    const first = sorted[0];

    if (!first) {
      return null;
    }

    const remainingMs =
      new Date(first.unlock_at).getTime() - now;

    return (
      <div className="card border-[var(--accent)] p-5">
        <div className="flex flex-col items-center gap-4 text-center">
          <div>
            <p className="badge">OPENS SOON</p>

            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              Mission {String(first.sequence).padStart(2, '0')}
            </p>

            <h3 className="mt-1 text-2xl font-black">
              {first.title}
            </h3>

            <p className="muted mt-2 text-sm">
              Unlocks {formatReleaseDate(first.unlock_at)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Unlocks in
            </p>

            <div className="mt-2 flex justify-center">
              <CountdownClock remainingMs={remainingMs} size="lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-[var(--accent)] p-5">
      <div className="flex flex-col items-center gap-4 text-center">
        <div>
          <p className="badge">
            {current.finale ? 'FINAL MISSION' : "THIS WEEK'S MISSION"}
          </p>

          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
            Mission {String(current.sequence).padStart(2, '0')}
          </p>

          <h3 className="mt-1 text-2xl font-black">
            {current.title}
          </h3>

          <p className="muted mt-2 text-sm">
            Available now · unlocked{' '}
            {formatReleaseDate(current.unlock_at)}
          </p>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
          ● Live
        </p>

        {next && (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Next mission in
            </p>

            <div className="mt-2 flex justify-center">
              <CountdownClock
                remainingMs={
                  new Date(next.unlock_at).getTime() - now
                }
                size="sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
