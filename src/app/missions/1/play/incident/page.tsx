import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function MissionOneIncidentPage() {
  const supabase = await createClient();

  // ----------------------------------
  // AUTHENTICATION
  // ----------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ----------------------------------
  // PLAYER PROFILE
  // ----------------------------------

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select(`
        id,
        alias,
        role,
        is_active,
        onboarding_complete,
        work_location_type
      `)
      .eq('id', user.id)
      .single();

  if (profileError || !profile) {
    console.error(
      '[MISSION 01 INCIDENT] Unable to load profile:',
      profileError
    );

    redirect('/login');
  }

  if (!profile.is_active) {
    redirect('/login');
  }

  if (profile.role === 'admin') {
    redirect('/admin');
  }

  if (!profile.onboarding_complete) {
    redirect('/onboarding');
  }

  if (!profile.work_location_type) {
    redirect('/select-workgroup');
  }

  // ----------------------------------
  // LOAD ATTEMPT
  // ----------------------------------

  const { data: attempt, error: attemptError } =
    await supabase
      .from('mission_attempts')
      .select(`
        id,
        status,
        current_stage,
        started_at,
        completed_at
      `)
      .eq('player_id', user.id)
      .eq('mission_id', 1)
      .maybeSingle();

  if (attemptError) {
    console.error(
      '[MISSION 01 INCIDENT] Unable to load attempt:',
      attemptError
    );

    redirect('/missions/1/play');
  }

  if (!attempt) {
    redirect('/missions/1/play');
  }

  // ----------------------------------
  // RESUME CORRECT SAVED STAGE
  // ----------------------------------

  if (
    attempt.status === 'submitted' ||
    attempt.current_stage === 'report'
  ) {
    redirect('/missions/1/play/report');
  }

  if (attempt.current_stage === 'containment') {
    redirect('/missions/1/play/containment');
  }

  if (attempt.current_stage === 'theory') {
    redirect('/missions/1/play/theory');
  }

  if (attempt.current_stage === 'evidence') {
    redirect('/missions/1/play/evidence');
  }

  /*
   * If current_stage is still "briefing", reaching this page
   * means the player has deliberately pressed
   * "Continue to Incident Briefing".
   *
   * This is the correct moment to advance the saved stage.
   */
  if (
    !attempt.current_stage ||
    attempt.current_stage === 'briefing'
  ) {
    const { error: stageError } =
      await supabase
        .from('mission_attempts')
        .update({
          current_stage: 'incident',
        })
        .eq('id', attempt.id)
        .eq('player_id', user.id)
        .eq('mission_id', 1);

    if (stageError) {
      console.error(
        '[MISSION 01 INCIDENT] Unable to save incident stage:',
        stageError
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#02080d] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-xl border border-red-950 bg-[#12090b] px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
            Priority Incident
          </p>

          <h1 className="mt-3 text-4xl font-black">
            09:17 Security Alert
          </h1>

          <p className="mt-2 text-slate-400">
            Suspicious account activity detected.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-cyan-950 bg-[#061019] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              Incident Summary
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Finance account compromise suspected
            </h2>

            <p className="mt-4 leading-7 text-slate-300">
              At 09:17, security monitoring detected access to a restricted
              folder using the account of Maya Bennett from the Finance
              Department.
            </p>

            <p className="mt-4 leading-7 text-slate-300">
              Maya has confirmed that she did not access the folder and did not
              intentionally sign in from an unfamiliar device.
            </p>

            <div className="mt-6 rounded-xl border border-red-900 bg-red-950/20 p-5">
              <p className="text-sm font-bold text-red-300">
                Your task:
              </p>

              <p className="mt-2 text-slate-300">
                Determine how the account was compromised, identify the most
                important evidence, reconstruct the attack, and recommend the
                correct containment response.
              </p>
            </div>

            <div className="mt-7">
              <Link
                href="/missions/1/play/evidence"
                className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black transition hover:bg-cyan-300"
              >
                Enter Evidence Room
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-cyan-950 bg-[#041018] p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              Case File
            </p>

            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Subject
                </dt>
                <dd className="mt-1 font-bold">
                  Maya Bennett
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Department
                </dt>
                <dd className="mt-1 font-bold">
                  Finance
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Alert Time
                </dt>
                <dd className="mt-1 font-bold">
                  09:17
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Evidence Files
                </dt>
                <dd className="mt-1 font-bold">
                  10
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Operative
                </dt>
                <dd className="mt-1 font-bold">
                  {profile.alias ?? 'Agent'}
                </dd>
              </div>
            </dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
