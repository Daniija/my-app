'use client';

import Image from 'next/image';

import Link from 'next/link';

import { useState } from 'react';

import MissionTwoLesson from '@/components/mission-two/MissionTwoLesson';

type Props = {
  playerAlias: string;

  previewMode?: boolean;

  alreadyCompleted?: boolean;
};

type TrailItem = {
  id: string;

  label: string;

  title: string;

  caption: string;

  meta: string;

  accent: string;

  imageSrc: string;

  imageTitle: string;

  location?: string;
};

const trailItems: TrailItem[] = [
  {
    id: 'badge',

    label: 'POST 01',

    title: 'First day at Brightwell 🎉',

    caption:
      'First day nerves 😅 but excited to officially join the Finance team at Brightwell Group! New badge and everything! #newjob #finance',

    meta: 'Public photo · Kingston',

    accent: 'WORKPLACE',

    imageSrc: '/mission-two/room-1/where-she-works.png',

    imageTitle: 'Maya showing her employee ID',

    location: 'Kingston, Jamaica',
  },

  {
    id: 'project',

    label: 'POST 02',

    title: 'Birthday vibes 🎂',

    caption:
      'Another birthday! 🎉 March 14 will always be my favourite day of the year 😂❤️ #birthdaygirl',

    meta: 'Public post · Personal',

    accent: 'BIRTHDAY',

    imageSrc: '/mission-two/room-1/birthday.png',

    imageTitle: 'Maya celebrating her birthday',

    location: 'Kingston, Jamaica',
  },

  {
    id: 'travel',

    label: 'POST 03',

    title: 'Montego Bay countdown 🌴',

    caption:
      'Five days until vacation! Montego Bay, Oct 20–25. I need this break 😍🌴 #mobay #vacationmode',

    meta: 'Public post · Travel',

    accent: 'TRAVEL',

    imageSrc: '/mission-two/room-1/upcoming-travel.png',

    imageTitle: 'Upcoming travel plans',

    location: 'Montego Bay, Jamaica',
  },

  {
    id: 'buddy',

    label: 'POST 04',

    title: 'Buddy runs the house 🐶',

    caption:
      'My baby Buddy turns 4 today 🐾 Still the best password— I mean, best dog ever 😂❤️',

    meta: 'Public post · Personal',

    accent: 'PERSONAL',

    imageSrc: '/mission-two/room-1/pet-name.png',

    imageTitle: 'Maya with her dog Buddy',

    location: 'Home',
  },

  {
    id: 'house',

    label: 'POST 05',

    title: 'Back at my favourite spot 🏃🏽‍♀️',

    caption:
      'Same place every Saturday morning! Nothing like starting the weekend with a workout 💪🏽',

    meta: 'Public post · Location',

    accent: 'LOCATION',

    imageSrc: '/mission-two/room-1/regular-location.png',

    imageTitle: 'A place Maya visits regularly',

    location: 'Kingston, Jamaica',
  },

  {
    id: 'coffee',

    label: 'POST 06',

    title: 'Throwback holiday photo 🌴',

    caption: 'Found this old holiday picture today 😂 Take me back! #throwback',

    meta: 'Public post',

    accent: 'DECOY',

    imageSrc: '/mission-two/room-1/holiday-photos.png',

    imageTitle: 'Old holiday photograph',
  },
];

export default function MissionTwoRoomOne({
  playerAlias,

  previewMode = false,

  alreadyCompleted = false,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const [activePreview, setActivePreview] = useState<TrailItem | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');

  const [feedback, setFeedback] = useState('');

  const [complete, setComplete] = useState(alreadyCompleted);

  const [score, setScore] = useState(alreadyCompleted ? 200 : 0);

  const [recoveredClue, setRecoveredClue] = useState<string | null>(null);

  const basePath = previewMode
    ? '/admin/missions/2/preview'
    : '/missions/2/play';

  function toggleItem(id: string) {
    if (complete || submitting) {
      return;
    }

    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

    setFeedback('');

    setError('');
  }

  async function submitInvestigation() {
    if (submitting || complete) {
      return;
    }

    if (selected.length === 0) {
      setError(
        'Select the posts or photos that expose useful information before submitting.',
      );

      return;
    }

    setSubmitting(true);

    setError('');

    setFeedback('');

    try {
      const response = await fetch(
        '/api/missions/2/room-1/submit',

        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',

            Accept: 'application/json',
          },

          body: JSON.stringify({
            selectedIds: selected,

            previewMode,
          }),
        },
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.message ?? 'Unable to submit Room 01.');
      }

      if (!body.correct) {
        setFeedback(
          body.message ??
            'Not quite. Review Maya’s posts again and look for details an attacker could use.',
        );

        return;
      }

      setScore(body.score ?? 200);

      setRecoveredClue(typeof body.clue === 'string' ? body.clue : null);

      setComplete(true);

      setActivePreview(null);

      setFeedback(body.message ?? 'Room cleared.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to submit Room 01.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#02080d] text-white">
      {/* ==================================

          HEADER

      ================================== */}

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

              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-cyan-600"
            >
              {previewMode ? 'Exit Preview' : 'Mission Control'}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* ==================================

            ADMIN PREVIEW

        ================================== */}

        {previewMode && (
          <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Admin Preview Mode
            </p>

            <p className="mt-1 text-sm text-slate-300">
              Answers are checked by the same server logic as the live game, but
              no player attempt, score or leaderboard data is written.
            </p>
          </div>
        )}

        {/* ==================================

            ROOM HEADER

        ================================== */}

        <section className="overflow-hidden rounded-2xl border border-cyan-950 bg-[#061019]">
          <div className="border-b border-cyan-950 bg-[#081822] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
                  Room 01
                </p>

                <h1 className="mt-2 text-3xl font-black sm:text-4xl">
                  The Social &amp; Photo Trail
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-400">
                  Maya&apos;s social profile looks ordinary. Open each post,
                  inspect what it reveals and decide whether the information
                  could help an attacker build a convincing profile of her.
                </p>
              </div>

              <div className="rounded-xl border border-cyan-900 bg-[#020b11] px-5 py-4 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Room Value
                </p>

                <p className="mt-1 text-2xl font-black text-cyan-300">200</p>

                <p className="text-xs text-slate-500">points</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[.72fr_1.28fr] sm:p-8">
            {/* ==================================

                SUBJECT PROFILE

            ================================== */}

            <aside className="space-y-5">
              <div className="rounded-2xl border border-slate-800 bg-[#020b11] p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                  Subject Profile
                </p>

                <div className="mt-5 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-800 bg-cyan-950/20 text-3xl">
                    👩🏽‍💼
                  </div>

                  <div>
                    <p className="text-xl font-black">Maya Bennett</p>

                    <p className="text-sm text-slate-400">@MayaB25</p>
                  </div>
                </div>

                <dl className="mt-6 space-y-4 text-sm">
                  <div>
                    <dt className="text-xs uppercase text-slate-500">Bio</dt>

                    <dd className="mt-1 font-bold">
                      Finance Assistant · Travel · Food · Life
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs uppercase text-slate-500">
                      Location
                    </dt>

                    <dd className="mt-1 font-bold">Kingston, Jamaica</dd>
                  </div>

                  <div>
                    <dt className="text-xs uppercase text-slate-500">
                      Visibility
                    </dt>

                    <dd className="mt-1 font-bold text-red-300">PUBLIC</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-cyan-900 bg-cyan-950/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                  Investigation Task
                </p>

                <p className="mt-3 leading-7 text-slate-300">
                  Use the Preview Post button to inspect each post as
                  Maya&apos;s followers would see it.
                </p>

                <p className="mt-3 text-sm text-slate-500">
                  Mark every post that exposes useful information. One post is
                  harmless.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#020b11] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Marked as risky
                </p>

                <p className="mt-1 text-2xl font-black text-cyan-300">
                  {selected.length} / 6
                </p>
              </div>
            </aside>

            {/* ==================================

                SOCIAL POSTS

            ================================== */}

            <div>
              <div className="grid gap-4 md:grid-cols-2">
                {trailItems.map((item) => {
                  const isSelected = selected.includes(item.id);

                  return (
                    <article
                      key={item.id}

                      className={`overflow-hidden rounded-2xl border ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/20'
                          : 'border-slate-800 bg-[#050d13]'
                      }`}
                    >
                      {/* CARTOON IMAGE */}

                      <div className="relative h-52 w-full overflow-hidden border-b border-slate-800 bg-black">
                        <Image
                          src={item.imageSrc}

                          alt={item.imageTitle}

                          fill

                          sizes="(max-width: 768px) 100vw, 50vw"

                          className="object-cover"
                        />

                        <div className="absolute left-3 top-3 rounded-full border border-black/40 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
                          {item.accent}
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                              {item.label}
                            </p>

                            <h3 className="mt-2 text-lg font-black">
                              {item.title}
                            </h3>
                          </div>

                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-black ${
                              isSelected
                                ? 'border-cyan-500 text-cyan-300'
                                : 'border-slate-700 text-slate-500'
                            }`}
                          >
                            {isSelected ? 'RISKY' : 'UNREVIEWED'}
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-slate-500">
                          {item.meta}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"

                            onClick={() => setActivePreview(item)}

                            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-black text-black transition hover:bg-cyan-300"
                          >
                            Preview Post
                          </button>

                          <button
                            type="button"

                            disabled={complete}

                            onClick={() => toggleItem(item.id)}

                            className={`rounded-lg border px-4 py-2 text-sm font-black transition ${
                              isSelected
                                ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300'
                                : 'border-slate-700 text-slate-300 hover:border-cyan-700'
                            }`}
                          >
                            {isSelected ? '✓ Marked Risky' : 'Mark as Risky'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* ==================================

                  SUBMIT

              ================================== */}

              {!complete && (
                <div className="mt-6 rounded-2xl border border-cyan-950 bg-[#07141d] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-black">
                        Ready to submit your analysis?
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Mark all risky posts and leave the harmless post
                        unselected.
                      </p>
                    </div>

                    <button
                      type="button"

                      disabled={submitting}

                      onClick={submitInvestigation}

                      className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {submitting ? 'Checking...' : 'Submit Analysis'}
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
              )}

              {/* ==================================

                  ROOM COMPLETE

              ================================== */}

              {complete && (
                <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-600 bg-[#03110d]">
                  <div className="border-b border-emerald-900 bg-emerald-950/30 px-6 py-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                          ✓ Room 01 Cleared
                        </p>

                        <h2 className="mt-2 text-3xl font-black text-white">
                          Exposure Identified
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                          You successfully identified the public information
                          that could help an attacker build a convincing profile
                          of Maya.
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-700 bg-black/30 px-5 py-3 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                          Room Score
                        </p>

                        <p className="mt-1 text-2xl font-black text-emerald-300">
                          +{score}
                        </p>

                        <p className="text-xs text-slate-500">/ 200 points</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-8 sm:px-8">
                    <div className="mx-auto max-w-2xl">
                      <MissionTwoLesson roomNumber={1} clue={recoveredClue} />

                      <div className="mt-8 rounded-2xl border border-slate-800 bg-black/30 p-6 text-center">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                          Escape Code Progress
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                          Eight encrypted fragments are hidden throughout Rooms
                          01–08.
                        </p>

                        <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-3">
                          <div className="flex h-14 w-12 items-center justify-center rounded-lg border border-cyan-400 bg-cyan-950/30 font-mono text-2xl font-black text-cyan-300">
                            {recoveredClue ?? '?'}
                          </div>

                          {Array.from({
                            length: 7,
                          }).map((_, index) => (
                            <div
                              key={index}
                              className="flex h-14 w-12 items-center justify-center rounded-lg border border-slate-700 bg-[#07141d] font-mono text-2xl font-black text-slate-600"
                            >
                              ?
                            </div>
                          ))}
                        </div>

                        <p className="mt-5 text-sm font-bold text-cyan-300">
                          1 / 8 fragments recovered
                        </p>

                        <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-cyan-400"
                            style={{
                              width: '12.5%',
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-6 rounded-xl border border-amber-900 bg-amber-950/20 p-5 text-left">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                          Intelligence Notice
                        </p>

                        <p className="mt-3 leading-7 text-slate-300">
                          The character you recovered is one part of the final
                          escape code. Seven additional fragments are hidden in
                          Rooms 02–08.
                        </p>

                        <p className="mt-3 font-bold text-white">
                          Recover all 8 fragments. Their order will not reveal
                          the answer automatically — you will need to unscramble
                          them at the final lock.
                        </p>
                      </div>

                      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6">
                        <div className="text-left">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Next Investigation
                          </p>

                          <p className="mt-1 font-black">
                            Room 02 — The Username Trail
                          </p>
                        </div>

                        <Link
                          href={
                            previewMode
                              ? `${basePath}/escape-room?stage=room-2`
                              : `${basePath}/escape-room`
                          }
                          className="rounded-lg bg-emerald-400 px-6 py-3 font-black text-black transition hover:bg-emerald-300"
                        >
                          Store Fragment &amp; Return →
                        </Link>
                      </div>

                      {previewMode && (
                        <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                          Preview only — no player progress, score or
                          leaderboard data is changed
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ==================================

          INSTAGRAM-STYLE POST PREVIEW

      ================================== */}

      {activePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"

          onClick={() => setActivePreview(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-[#0b0b0b] shadow-2xl"

            onClick={(event) => event.stopPropagation()}
          >
            {/* PROFILE HEADER */}

            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-fuchsia-500 bg-gradient-to-br from-fuchsia-500/20 to-amber-400/20 text-xl">
                  👩🏽‍💼
                </div>

                <div>
                  <p className="text-sm font-black">MayaB25</p>

                  {activePreview.location && (
                    <p className="text-[11px] text-slate-500">
                      {activePreview.location}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"

                onClick={() => setActivePreview(null)}

                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-300 hover:border-slate-500"
              >
                ✕
              </button>
            </div>

            {/* CARTOON IMAGE */}

            <div className="relative aspect-square w-full overflow-hidden bg-black">
              <Image
                src={activePreview.imageSrc}

                alt={activePreview.imageTitle}

                fill

                sizes="448px"

                className="object-cover"
              />
            </div>

            {/* SOCIAL POST */}

            <div className="border-t border-slate-800 bg-black px-4 py-4">
              <div className="flex items-center gap-4 text-xl">
                <span>♡</span>

                <span>◯</span>

                <span>⌁</span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                <span className="mr-2 font-black text-white">MayaB25</span>

                {activePreview.caption}
              </p>

              <p className="mt-3 text-[11px] uppercase tracking-wider text-slate-600">
                Public post · visible to anyone
              </p>

              {!complete && (
                <button
                  type="button"

                  onClick={() => toggleItem(activePreview.id)}

                  className={`mt-5 w-full rounded-lg border px-4 py-3 text-sm font-black transition ${
                    selected.includes(activePreview.id)
                      ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300'
                      : 'border-slate-700 text-white hover:border-cyan-700'
                  }`}
                >
                  {selected.includes(activePreview.id)
                    ? '✓ Marked as Risky'
                    : 'Mark This Post as Risky'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
