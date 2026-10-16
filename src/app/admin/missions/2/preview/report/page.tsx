import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';

export const dynamic =
  'force-dynamic';

export default async function MissionTwoAdminPreviewReportPage() {
  const { profile } =
    await requireAdmin();

  return (
    <main className="min-h-screen bg-[#02080d] px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            Admin Preview Mode
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Preview completion only. No player attempt, score or leaderboard result has been created.
          </p>
        </div>

        <section className="overflow-hidden rounded-2xl border border-emerald-600 bg-[#03110d]">
          <div className="border-b border-emerald-900 bg-emerald-950/30 p-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">
              Mission 02 Complete
            </p>
            <h1 className="mt-4 text-4xl font-black">
              The Digital Footprint
            </h1>
            <p className="mt-3 text-slate-400">
              Previewed by {profile.alias ?? 'Administrator'}
            </p>
          </div>

          <div className="p-8 text-center">
            <div className="rounded-2xl border border-cyan-800 bg-[#020b11] p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Final Escape Code
              </p>
              <p className="mt-4 font-mono text-4xl font-black tracking-[0.28em] text-cyan-300">
                PR1V4CY
              </p>
              <p className="mt-3 text-xl font-black">
                PRIVACY
              </p>
            </div>

            <Link
              href="/admin"
              className="mt-8 inline-block rounded-lg bg-emerald-400 px-6 py-3 font-black text-black"
            >
              Exit Preview
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
