'use client';

import Link from 'next/link';

import { useEffect, useState } from 'react';

import type { MissionTwoRoomConfig } from '@/lib/missions/mission-two-rooms';

import MissionTwoLesson from '@/components/mission-two/MissionTwoLesson';

type Props = {
  config: MissionTwoRoomConfig;

  playerAlias: string;

  previewMode?: boolean;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function CodeProgress({
  roomNumber,

  clue,
}: {
  roomNumber: number;

  clue: string | null;
}) {
  const totalFragments = 8;

  const recoveredCount = Math.min(roomNumber, totalFragments);

  return (
    <div className="mt-8 rounded-2xl border border-slate-800 bg-black/30 p-6">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
        Escape Code Progress
      </p>

      <p className="mt-2 text-sm text-slate-400">
        Eight encrypted fragments are hidden throughout Rooms 01–08.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-3">
        {Array.from({
          length: totalFragments,
        }).map((_, index) => {
          const isPrevious = index < roomNumber - 1;

          const isCurrent = index === roomNumber - 1;

          return (
            <div
              key={index}

              className={`flex h-14 w-12 items-center justify-center rounded-lg border font-mono text-2xl font-black ${
                isCurrent
                  ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300'
                  : isPrevious
                    ? 'border-emerald-700 bg-emerald-950/20 text-emerald-300'
                    : 'border-slate-700 bg-[#07141d] text-slate-600'
              }`}
            >
              {isCurrent ? (clue ?? '?') : isPrevious ? '✓' : '?'}
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-sm font-bold text-cyan-300">
        {recoveredCount} / 8 fragments recovered
      </p>

      <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400"

          style={{
            width: `${Math.min(100, (recoveredCount / totalFragments) * 100)}%`,
          }}
        />
      </div>

      {clue && (
        <p className="mt-4 text-xs text-slate-500">Latest fragment: {clue}</p>
      )}
    </div>
  );
}

export default function MissionTwoRoomChallenge({
  config,

  playerAlias,

  previewMode = false,
}: Props) {
  const basePath = previewMode
    ? '/admin/missions/2/preview'
    : '/missions/2/play';

  /*

   * HYDRATION-SAFE RANDOMIZATION

   *

   * First server render and first browser

   * render use the original option order.

   *

   * The options are randomized only after

   * the component has mounted in the browser.

   */

  const [randomizedOptions, setRandomizedOptions] = useState(
    () => config.options ?? [],
  );

  const [randomizedMatchChoices, setRandomizedMatchChoices] = useState(
    () => config.matchChoices ?? [],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shuffle runs only after mount to avoid an SSR/client hydration mismatch
    setRandomizedOptions(shuffle(config.options ?? []));

    setRandomizedMatchChoices(shuffle(config.matchChoices ?? []));
  }, [config.number, config.options, config.matchChoices]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [sequence, setSequence] = useState<string[]>([]);

  const [matches, setMatches] = useState<Record<string, string>>({});

  const [finalCode, setFinalCode] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');

  const [feedback, setFeedback] = useState('');

  const [complete, setComplete] = useState(false);

  const [score, setScore] = useState(0);

  const [recoveredClue, setRecoveredClue] = useState<string | null>(null);

  function toggleMulti(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

    setFeedback('');

    setError('');
  }

  function selectSingle(id: string) {
    setSelectedIds([id]);

    setFeedback('');

    setError('');
  }

  function addSequence(id: string) {
    if (sequence.includes(id)) {
      setSequence(sequence.filter((item) => item !== id));

      return;
    }

    setSequence([...sequence, id]);
  }

  function resetSequence() {
    setSequence([]);

    setFeedback('');

    setError('');
  }

  async function submitRoom() {
    setSubmitting(true);

    setError('');

    setFeedback('');

    try {
      const response = await fetch(
        `/api/missions/2/room-${config.number}/submit`,

        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',

            Accept: 'application/json',
          },

          body: JSON.stringify({
            selectedIds,

            sequence,

            matches,

            finalCode,

            previewMode,
          }),
        },
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.message ?? 'Unable to submit this room.');
      }

      if (!body.correct) {
        setFeedback(
          body.message ?? 'Not quite. Review the evidence and try again.',
        );

        return;
      }

      setScore(body.score ?? config.score);

      setRecoveredClue(typeof body.clue === 'string' ? body.clue : null);

      setComplete(true);

      setFeedback(body.message ?? 'Room cleared.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to submit this room.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const nextRoom = config.number < 10 ? config.number + 1 : null;

  return (
    <main className="min-h-screen bg-[#02080d] text-white">
      <header className="border-b border-cyan-950 bg-[#07141d]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-400">
              Cyber Defence Unit
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Mission 02 · The Digital Footprint
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                {previewMode ? 'Administrator' : 'Operative'}
              </p>

              <p className="font-bold">{playerAlias}</p>
            </div>

            <Link
              href={previewMode ? '/admin' : '/dashboard'}

              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300"
            >
              {previewMode ? 'Exit Preview' : 'Mission Control'}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {previewMode && (
          <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Admin Preview Mode
            </p>

            <p className="mt-1 text-sm text-slate-300">
              This uses the live room logic but does not save player progress,
              scores or leaderboard data.
            </p>
          </div>
        )}

        {!complete && (
          <section className="overflow-hidden rounded-2xl border border-cyan-950 bg-[#061019]">
            <div className="border-b border-cyan-950 bg-[#081822] p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
                    Room{' '}
                    {String(config.number).padStart(
                      2,

                      '0',
                    )}
                  </p>

                  <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                    {config.title}
                  </h1>

                  <p className="mt-2 text-lg font-bold text-cyan-300">
                    {config.subtitle}
                  </p>

                  <p className="mt-4 max-w-3xl leading-7 text-slate-400">
                    {config.instructions}
                  </p>
                </div>

                <div className="rounded-xl border border-cyan-900 bg-[#020b11] px-5 py-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Room Value
                  </p>

                  <p className="mt-1 text-2xl font-black text-cyan-300">
                    {config.score}
                  </p>

                  <p className="text-xs text-slate-500">points</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {(config.type === 'single' || config.type === 'multi') && (
                <div className="grid gap-4 md:grid-cols-2">
                  {randomizedOptions.map((option) => {
                    const selected = selectedIds.includes(option.id);

                    return (
                      <button
                        key={option.id}

                        type="button"

                        onClick={() =>
                          config.type === 'single'
                            ? selectSingle(option.id)
                            : toggleMulti(option.id)
                        }

                        className={`rounded-2xl border p-5 text-left transition ${
                          selected
                            ? 'border-cyan-400 bg-cyan-950/30'
                            : 'border-slate-800 bg-[#050d13] hover:border-cyan-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-lg font-black">{option.title}</h2>

                          {selected && (
                            <span className="rounded-full border border-cyan-500 px-2 py-1 text-[10px] font-black text-cyan-300">
                              SELECTED
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          {option.detail}
                        </p>

                        {option.tag && (
                          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                            {option.tag}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {config.type === 'sequence' && (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    {randomizedOptions.map((option) => {
                      const position = sequence.indexOf(option.id);

                      return (
                        <button
                          key={option.id}

                          type="button"

                          onClick={() => addSequence(option.id)}

                          className={`rounded-xl border p-4 text-left ${
                            position >= 0
                              ? 'border-cyan-400 bg-cyan-950/30'
                              : 'border-slate-800 bg-[#050d13]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 font-black">
                              {position >= 0 ? position + 1 : '?'}
                            </div>

                            <div>
                              <p className="font-black">{option.title}</p>

                              <p className="mt-1 text-sm text-slate-500">
                                {option.detail}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"

                    onClick={resetSequence}

                    className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300"
                  >
                    Reset Sequence
                  </button>
                </>
              )}

              {config.type === 'matching' && (
                <div className="space-y-4">
                  {config.matchRows?.map((row) => (
                    <div
                      key={row.id}

                      className="grid gap-3 rounded-xl border border-slate-800 bg-[#050d13] p-4 md:grid-cols-[1fr_1.2fr]"
                    >
                      <div className="font-black">{row.left}</div>

                      <select
                        value={matches[row.id] ?? ''}

                        onChange={(event) =>
                          setMatches({
                            ...matches,

                            [row.id]: event.target.value,
                          })
                        }

                        className="rounded-lg border border-slate-700 bg-[#07141d] px-3 py-3 text-white"
                      >
                        <option value="">Choose cleanup action...</option>

                        {randomizedMatchChoices.map((choice) => (
                          <option
                            key={choice.id}

                            value={choice.id}
                          >
                            {choice.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {config.type === 'final-code' && (
                <div className="mx-auto max-w-xl text-center">
                  <div className="rounded-2xl border border-cyan-800 bg-[#020b11] p-8">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
                      Final Security Lock
                    </p>

                    <p className="mt-3 text-sm text-slate-400">
                      Enter the 8-character escape code created from the
                      fragments you recovered.
                    </p>

                    <input
                      value={finalCode}

                      onChange={(event) =>
                        setFinalCode(
                          event.target.value

                            .toUpperCase()

                            .slice(
                              0,

                              8,
                            ),
                        )
                      }

                      maxLength={8}

                      autoComplete="off"

                      spellCheck={false}

                      placeholder="_ _ _ _ _ _ _ _"

                      className="mt-8 w-full rounded-xl border border-slate-700 bg-black/40 px-5 py-5 text-center font-mono text-4xl font-black uppercase tracking-[0.35em] text-cyan-300 outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6">
                <Link
                  href={`${basePath}/escape-room`}

                  className="rounded-lg border border-slate-700 px-5 py-3 font-bold text-slate-300"
                >
                  ← Command Centre
                </Link>

                <button
                  type="button"

                  disabled={submitting}

                  onClick={submitRoom}

                  className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {submitting
                    ? 'Checking...'
                    : config.number === 10
                      ? 'Unlock Final Door'
                      : 'Submit Analysis'}
                </button>
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              {feedback && (
                <p className="mt-4 rounded-lg border border-amber-900 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
                  {feedback}
                </p>
              )}
            </div>
          </section>
        )}

        {complete && config.number >= 2 && config.number <= 8 && (
          <section className="overflow-hidden rounded-2xl border border-emerald-600 bg-[#03110d]">
            <div className="border-b border-emerald-900 bg-emerald-950/30 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                    ✓ Room{' '}
                    {String(config.number).padStart(
                      2,

                      '0',
                    )}{' '}
                    Cleared
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    {config.number === 8
                      ? 'Attack Chain Reconstructed'
                      : 'Intelligence Recovered'}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    {config.number === 8
                      ? 'You successfully reconstructed how public information can be collected, connected and turned into a convincing phishing attack.'
                      : 'Your investigation successfully cleared this stage of the digital-footprint investigation.'}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-700 bg-black/30 px-5 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Room Score
                  </p>

                  <p className="mt-1 text-2xl font-black text-emerald-300">
                    +{score}
                  </p>

                  <p className="text-xs text-slate-500">
                    / {config.score} points
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-8 sm:px-8">
              <div className="mx-auto max-w-2xl">
                <MissionTwoLesson
                  roomNumber={config.number}

                  clue={recoveredClue}
                />

                <CodeProgress
                  roomNumber={config.number}

                  clue={recoveredClue}
                />

                <div className="mt-6 rounded-xl border border-amber-900 bg-amber-950/20 p-5 text-left">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
                    Intelligence Notice
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Store the fragment you recovered. Rooms 01–08 each contain
                    one character, and the eight characters must be rearranged
                    at the final security lock.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6">
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Next Investigation
                    </p>

                    <p className="mt-1 font-black">
                      {nextRoom
                        ? `Room ${String(nextRoom).padStart(
                            2,

                            '0',
                          )}`
                        : 'Final Report'}
                    </p>
                  </div>

                  <Link
                    href={
                      previewMode && nextRoom
                        ? `${basePath}/escape-room?stage=room-${nextRoom}`
                        : `${basePath}/escape-room`
                    }

                    className="rounded-lg bg-emerald-400 px-6 py-3 font-black text-black"
                  >
                    Store Fragment &amp; Return →
                  </Link>
                </div>

                {previewMode && (
                  <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                    Preview only — no player progress, score or leaderboard data
                    is changed
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {complete && config.number === 9 && (
          <section className="overflow-hidden rounded-2xl border border-emerald-600 bg-[#03110d]">
            <div className="border-b border-emerald-900 bg-emerald-950/30 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                    ✓ Room 09 Cleared
                  </p>

                  <h2 className="mt-2 text-3xl font-black">Exposure Reduced</h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Maya&apos;s digital footprint has been reviewed and
                    unnecessary exposure has been reduced.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-700 bg-black/30 px-5 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Room Score
                  </p>

                  <p className="mt-1 text-2xl font-black text-emerald-300">
                    +{score}
                  </p>

                  <p className="text-xs text-slate-500">
                    / {config.score} points
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-8 sm:px-8">
              <div className="mx-auto max-w-2xl">
                <MissionTwoLesson roomNumber={9} />

                <div className="mt-6 rounded-xl border border-cyan-900 bg-cyan-950/10 p-5 text-left">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                    Final Lock Ready
                  </p>

                  <p className="mt-3 leading-7 text-slate-300">
                    You should now have eight fragments collected from Rooms
                    01–08. Rearrange those characters to discover the final
                    escape code.
                  </p>
                </div>

                <div className="mt-8 flex justify-end border-t border-slate-800 pt-6">
                  <Link
                    href={`${basePath}/room-10`}

                    className="rounded-lg bg-emerald-400 px-6 py-3 font-black text-black"
                  >
                    Proceed to Final Lock →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {complete && config.number === 10 && (
          <section className="overflow-hidden rounded-2xl border border-emerald-500 bg-[#03110d]">
            <div className="border-b border-emerald-800 bg-emerald-950/30 p-8 text-center">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">
                Access Granted
              </p>

              <h2 className="mt-4 text-4xl font-black sm:text-5xl">
                Escape Successful
              </h2>
            </div>

            <div className="p-8 text-center">
              <div className="mx-auto max-w-lg rounded-2xl border border-cyan-500 bg-[#020b11] p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Escape Code
                </p>

                <p className="mt-4 font-mono text-4xl font-black tracking-[0.28em] text-cyan-300 sm:text-5xl">
                  4PRIVACY
                </p>
              </div>

              <p className="mx-auto mt-7 max-w-2xl leading-7 text-slate-300">
                Every photo, username, location, account and personal detail can
                leave a digital trail. Protect the trail. Protect your privacy.
              </p>

              <div className="mt-6 rounded-xl border border-emerald-800 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Final Room Score
                </p>

                <p className="mt-1 text-2xl font-black text-emerald-300">
                  +{score}
                </p>
              </div>

              <Link
                href={previewMode ? '/admin' : `${basePath}/report`}

                className="mt-8 inline-block rounded-lg bg-emerald-400 px-7 py-3 font-black text-black"
              >
                {previewMode ? 'Exit Preview' : 'View Mission Report →'}
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
