import Link from 'next/link';

type Props = {
  playerAlias: string;
  missionSequence: number;
  missionTitle: string;
};

export default function MissionPreviewComingSoon({
  playerAlias,
  missionSequence,
  missionTitle,
}: Props) {
  const missionLabel = String(missionSequence).padStart(2, '0');

  return (
    <main className="min-h-screen bg-[#02080d] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* ADMIN PREVIEW BANNER */}
        <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                Admin Preview Mode
              </p>

              <p className="mt-1 text-sm text-slate-300">
                You are previewing Mission {missionLabel}. No player progress
                or score will be saved.
              </p>
            </div>

            <Link
              href="/admin"
              className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-950/40"
            >
              Exit Preview
            </Link>
          </div>
        </div>

        {/* OPERATIVE HEADER */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-950 bg-[#07141d] px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-400">
              Cyber Defence Unit
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Secure Operations Network
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Administrator
            </p>

            <p className="font-bold">{playerAlias}</p>
          </div>
        </header>

        {/* COMING SOON */}
        <section className="overflow-hidden rounded-2xl border border-cyan-950 bg-[#061019]">
          <div className="border-b border-cyan-950 bg-[#081822] px-6 py-5">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
              Priority Transmission
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Mission {missionLabel}
            </h1>

            <h2 className="mt-1 text-2xl font-bold text-cyan-300">
              {missionTitle}
            </h2>
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Development Status
            </p>

            <h3 className="mt-2 text-2xl font-black">
              Content not yet built
            </h3>

            <p className="mt-4 max-w-2xl leading-7 text-slate-400">
              Mission {missionLabel} does not have a player briefing, stages,
              or scoring implemented yet. Once this mission&apos;s gameplay is
              built, this page will let administrators walk through it the
              same way Mission 01 and Mission 02 can be previewed — without
              affecting the release schedule, player progress, scores, or the
              leaderboard.
            </p>

            <div className="mt-8">
              <Link
                href="/admin"
                className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black transition hover:bg-cyan-300"
              >
                Return to Admin Dashboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
