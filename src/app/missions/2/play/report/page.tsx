import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MissionTwoReportPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const {
    data: profile,
  } = await supabase
    .from('profiles')
    .select(`
      alias,
      role,
      is_active
    `)
    .eq('id', user.id)
    .single();

  if (
    !profile ||
    !profile.is_active
  ) {
    redirect('/login');
  }

  if (
    profile.role ===
    'admin'
  ) {
    redirect('/admin');
  }

  const {
    data: attempt,
  } = await supabase
    .from('mission_attempts')
    .select(`
      status,
      current_stage,
      completed_at
    `)
    .eq(
      'player_id',
      user.id
    )
    .eq(
      'mission_id',
      2
    )
    .maybeSingle();

  if (
    !attempt ||
    (
      attempt.status !==
        'submitted' &&
      attempt.current_stage !==
        'report'
    )
  ) {
    redirect(
      '/missions/2/play'
    );
  }

  return (
    <main className="min-h-screen bg-[#02080d] px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <section className="overflow-hidden rounded-2xl border border-emerald-600 bg-[#03110d]">
          <div className="border-b border-emerald-900 bg-emerald-950/30 p-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-300">
              Mission 02 Complete
            </p>
            <h1 className="mt-4 text-4xl font-black">
              The Digital Footprint
            </h1>
          </div>

          <div className="p-8">
            <div className="rounded-2xl border border-cyan-800 bg-[#020b11] p-7 text-center">
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

            <h2 className="mt-8 text-2xl font-black">
              Excellent work, {profile.alias ?? 'Agent'}.
            </h2>

            <p className="mt-4 leading-7 text-slate-300">
              The attacker did not need one dramatic secret. They collected many small public details and connected them into a convincing profile. Reducing unnecessary exposure makes that kind of attack much harder.
            </p>

            <Link
              href="/dashboard"
              className="mt-8 inline-block rounded-lg bg-emerald-400 px-6 py-3 font-black text-black"
            >
              Return to Mission Control →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
