import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function MissionOneAdminPreviewReportPage() {
  const { profile } = await requireAdmin();

  return (
    <main className="min-h-screen bg-[#02080d] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            Admin Preview Mode
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Preview completion only. No player attempt, score or leaderboard result has been created.
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
            Mission Complete
          </p>

          <h1 className="mt-3 text-4xl font-black">
            BREACH REPORT
          </h1>

          <p className="mt-2 text-slate-400">
            Previewed by {profile.alias ?? 'Administrator'}
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-cyan-900 bg-[#061019] p-8 text-center">
          <p className="text-sm uppercase tracking-widest text-slate-500">
            Final Mission Score
          </p>

          <p className="mt-3 text-6xl font-black text-cyan-300">
            1500
          </p>

          <p className="mt-1 text-xl text-slate-500">
            / 1500
          </p>

          <p className="mt-4 font-bold text-emerald-400">
            100% Investigation Accuracy
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <ScoreCard label="Evidence" score={500} max={500} />
          <ScoreCard label="Theory" score={600} max={600} />
          <ScoreCard label="Containment" score={350} max={350} />
          <ScoreCard label="Intel Bonus" score={50} max={50} />
        </section>

        <section className="mt-8 rounded-2xl border border-red-900 bg-red-950/10 p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
            Incident Finding
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Credential Phishing Confirmed
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            Maya Bennett received a convincing Project Horizon email directing
            her to a fraudulent login page. Her credentials were captured and
            an MFA request was subsequently approved.
          </p>

          <p className="mt-4 leading-7 text-slate-300">
            The attacker then authenticated from the unfamiliar WIN-91K2
            device, accessed restricted Finance information, and created an
            external share containing Project Horizon financial data.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/admin"
            className="rounded-lg bg-emerald-400 px-6 py-3 font-black text-black"
          >
            Exit Preview
          </Link>
        </div>
      </div>
    </main>
  );
}

function ScoreCard({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  return (
    <div className="rounded-xl border border-cyan-950 bg-[#061019] p-5 text-center">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{score}</p>
      <p className="text-xs text-slate-600">/ {max}</p>
    </div>
  );
}
