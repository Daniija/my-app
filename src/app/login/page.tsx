import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import UpcomingMission from '@/components/UpcomingMission';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  // The login page is public, and the "missions" table can only be read
  // by authenticated players (see supabase/migrations/001_initial.sql).
  // The admin client bypasses RLS so logged-out visitors can still see
  // which mission is live and when the next one unlocks.
  const now = new Date();

  const admin = createAdminClient();

  const { data: missions, error: missionError } = await admin
    .from('missions')
    .select(`
      id,
      title,
      slug,
      sequence,
      unlock_at,
      status,
      finale
    `)
    .order('sequence', { ascending: true });

  if (missionError) {
    console.error(
      '[LOGIN] Unable to load missions:',
      missionError
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="grid items-center gap-7 md:grid-cols-[1.15fr_.85fr]">
        <section>
          <span className="badge">CYBERSECURITY MONTH 2026</span>
          <h1 className="mt-4 text-5xl font-black tracking-tight">CYBER DEFENCE UNIT</h1>
          <p className="mt-3 text-xl font-bold text-[var(--accent)]">Securing the Next 250</p>
          <p className="muted mt-5 max-w-2xl leading-7">
            Four Fridays. One connected cyber incident. Investigate evidence, survive social engineering,
            contain the final attack, and compete on a month-long live leaderboard.
          </p>

          {(missions ?? []).length > 0 && (
            <div className="mt-6">
              <UpcomingMission
                serverNow={now.toISOString()}
                missions={(missions ?? []).map((mission) => ({
                  id: mission.id,
                  sequence: mission.sequence,
                  title: mission.title,
                  unlock_at: mission.unlock_at,
                  status: mission.status,
                  finale: mission.finale,
                }))}
              />
            </div>
          )}
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
