import Link from 'next/link';

import {
  redirect,
} from 'next/navigation';

import {
  createClient,
} from '@/lib/supabase/server';

export default async function MissionTwoIncidentPage() {
  const supabase =
    await createClient();

  // ----------------------------------
  // AUTHENTICATION
  // ----------------------------------

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ----------------------------------
  // PLAYER PROFILE
  // ----------------------------------

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      alias,
      role,
      is_active,
      onboarding_complete,
      work_location_type
    `)
    .eq(
      'id',
      user.id
    )
    .single();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      '[MISSION 02 INCIDENT] Unable to load profile:',
      profileError
    );

    redirect('/login');
  }

  if (
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

  if (
    !profile.onboarding_complete
  ) {
    redirect(
      '/onboarding'
    );
  }

  if (
    !profile.work_location_type
  ) {
    redirect(
      '/select-workgroup'
    );
  }

  // ----------------------------------
  // LOAD ATTEMPT
  // ----------------------------------

  const {
    data: attempt,
    error: attemptError,
  } = await supabase
    .from(
      'mission_attempts'
    )
    .select(`
      id,
      status,
      current_stage,
      started_at,
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
    attemptError
  ) {
    console.error(
      '[MISSION 02 INCIDENT] Unable to load attempt:',
      attemptError
    );

    redirect(
      '/missions/2/play'
    );
  }

  if (!attempt) {
    redirect(
      '/missions/2/play'
    );
  }

  // ----------------------------------
  // RESUME CORRECT STAGE
  // ----------------------------------

  if (
    attempt.status ===
      'submitted' ||
    attempt.current_stage ===
      'report'
  ) {
    redirect(
      '/missions/2/play/report'
    );
  }

  if (
    attempt.current_stage?.startsWith(
      'room-'
    )
  ) {
    redirect(
      `/missions/2/play/${attempt.current_stage}`
    );
  }

  // ----------------------------------
  // ADVANCE BRIEFING → INCIDENT
  // ----------------------------------

  if (
    !attempt.current_stage ||
    attempt.current_stage ===
      'briefing'
  ) {
    const {
      error: stageError,
    } = await supabase
      .from(
        'mission_attempts'
      )
      .update({
        current_stage:
          'incident',
      })
      .eq(
        'id',
        attempt.id
      )
      .eq(
        'player_id',
        user.id
      )
      .eq(
        'mission_id',
        2
      );

    if (stageError) {
      console.error(
        '[MISSION 02 INCIDENT] Unable to save incident stage:',
        stageError
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#02080d] px-4 py-8 text-white sm:px-6">

      <div className="mx-auto max-w-6xl">

        {/* PRIORITY HEADER */}

        <header className="mb-6 rounded-xl border border-red-950 bg-[#12090b] px-6 py-5">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
            Priority Intelligence
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Digital Exposure Detected
          </h1>

          <p className="mt-2 text-slate-400">
            Investigation linked public
            information to the attack on
            Maya Bennett.
          </p>

        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">

          {/* INCIDENT SUMMARY */}

          <div className="rounded-2xl border border-cyan-950 bg-[#061019] p-6 sm:p-8">

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              Incident Summary
            </p>

            <h2 className="mt-3 text-2xl font-black">
              The attacker knew more
              about Maya than expected.
            </h2>

            <p className="mt-5 leading-7 text-slate-300">
              Mission 01 confirmed that
              Maya Bennett was targeted
              with a convincing phishing
              attack.
            </p>

            <p className="mt-4 leading-7 text-slate-300">
              Further analysis has
              revealed something more
              concerning. The attacker
              already knew details about
              Maya&apos;s workplace, her job
              and Project Horizon before
              making contact.
            </p>

            <p className="mt-4 leading-7 text-slate-300">
              Investigators initially
              suspected that this
              information had been
              stolen from an internal
              system.
            </p>

            <p className="mt-4 leading-7 text-slate-300">
              That theory was wrong.
            </p>

            <div className="mt-6 rounded-xl border border-red-900 bg-red-950/20 p-5">

              <p className="text-sm font-bold text-red-300">
                New intelligence:
              </p>

              <p className="mt-2 leading-7 text-slate-300">
                Several pieces of
                information used in the
                attack appear to have
                been publicly available
                online.
              </p>

            </div>

            <div className="mt-6">

              <p className="text-sm font-bold text-cyan-300">
                Your task:
              </p>

              <p className="mt-2 leading-7 text-slate-300">
                Follow Maya&apos;s digital
                trail and determine how
                much information a
                stranger could discover
                about her without
                accessing the company
                network.
              </p>

            </div>

          </div>

          {/* CASE INTELLIGENCE */}

          <aside className="rounded-2xl border border-cyan-950 bg-[#041018] p-6">

            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              Known Intelligence
            </p>

            <div className="mt-5 space-y-3">

              <IntelItem
                label="Subject"
                value="Maya Bennett"
              />

              <IntelItem
                label="Employer"
                value="Brightwell Group"
              />

              <IntelItem
                label="Department"
                value="Finance"
              />

              <IntelItem
                label="Known Project"
                value="Project Horizon"
              />

              <IntelItem
                label="Exposure Source"
                value="Public Internet"
              />

              <IntelItem
                label="Threat"
                value="Profile Building"
              />

            </div>

          </aside>

        </section>

        {/* CONNECTION BETWEEN MISSION 1 & 2 */}

        <section className="mt-6 rounded-2xl border border-amber-900/70 bg-amber-950/10 p-6">

          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
            Investigation Link
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">

            <Step
              title="Public Information"
              text="Small details are discovered online."
            />

            <Arrow />

            <Step
              title="Attacker Profile"
              text="The details are connected together."
            />

            <Arrow />

            <Step
              title="Phishing Attack"
              text="The information makes the message believable."
            />

          </div>

        </section>

        {/* MISSION OBJECTIVE */}

        <section className="mt-6 rounded-2xl border border-cyan-950 bg-[#061019] p-6">

          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
            Mission Objective
          </p>

          <h2 className="mt-3 text-2xl font-black">
            Trace the digital footprint.
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">

            <Objective>
              Investigate Maya&apos;s online
              presence.
            </Objective>

            <Objective>
              Identify information an
              attacker could use.
            </Objective>

            <Objective>
              Discover how separate
              pieces of information
              become connected.
            </Objective>

            <Objective>
              Help Maya reduce
              unnecessary online
              exposure.
            </Objective>

          </div>

        </section>

        {/* ESCAPE ROOM ENTRY */}

        <div className="mt-8 rounded-2xl border border-red-900 bg-[#10070a] p-6 sm:p-8">

          <div className="flex flex-wrap items-center justify-between gap-5">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
                Restricted Investigation Zone
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Digital Footprint Escape Room
              </h2>

              <p className="mt-2 max-w-2xl text-slate-400">
                Ten rooms stand between
                you and the full story.
                Follow the clues,
                investigate the
                exposure and unlock the
                final code.
              </p>

            </div>

            <Link
              href="/missions/2/play/escape-room"
              className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black transition hover:bg-cyan-300"
            >
              Enter Escape Room →
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}

function IntelItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#020b11] p-4">

      <p className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-bold">
        {value}
      </p>

    </div>
  );
}

function Objective({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-800 bg-[#020b11] p-4">

      <span className="font-black text-cyan-400">
        ✓
      </span>

      <p className="text-sm text-slate-300">
        {children}
      </p>

    </div>
  );
}

function Step({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#020b11] p-4 text-center">

      <p className="font-black">
        {title}
      </p>

      <p className="mt-2 text-sm text-slate-400">
        {text}
      </p>

    </div>
  );
}

function Arrow() {
  return (
    <div className="text-center text-2xl font-black text-cyan-400">
      →
    </div>
  );
}