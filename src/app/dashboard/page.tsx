import Link from 'next/link';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import SignOutButton from '@/components/SignOutButton';

import UpcomingMission from '@/components/UpcomingMission';


export default async function DashboardPage() {
  const supabase =
    await createClient();


  // --------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------

  const {
    data: { user },
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect('/login');
  }


  // --------------------------------------------------
  // LOAD PLAYER PROFILE
  // --------------------------------------------------

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        username,
        alias,
        department,
        role,
        is_active,
        is_tester,
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
      '[DASHBOARD] Unable to load profile:',
      profileError
    );

    redirect('/login');
  }


  if (
    !profile.is_active
  ) {
    redirect('/login');
  }


  // --------------------------------------------------
  // ADMIN REDIRECT
  // --------------------------------------------------

  if (
    profile.role ===
    'admin'
  ) {
    redirect('/admin');
  }


  // --------------------------------------------------
  // ONBOARDING
  // --------------------------------------------------

  if (
    !profile.onboarding_complete
  ) {
    redirect(
      '/onboarding'
    );
  }


  // --------------------------------------------------
  // WORKGROUP SELECTION
  // --------------------------------------------------

  if (
    !profile.work_location_type
  ) {
    redirect(
      '/select-workgroup'
    );
  }


  // --------------------------------------------------
  // LOAD MISSIONS
  // --------------------------------------------------

  const {
    data: missions,
    error: missionError,
  } =
    await supabase
      .from('missions')
      .select(`
        id,
        title,
        slug,
        sequence,
        max_score,
        unlock_at,
        status,
        finale
      `)
      .order(
        'sequence',
        {
          ascending:
            true,
        }
      );


  if (
    missionError
  ) {
    console.error(
      '[DASHBOARD] Unable to load missions:',
      missionError
    );
  }


  // --------------------------------------------------
  // LOAD PLAYER LEADERBOARD SCORES
  // --------------------------------------------------

  const {
    data: leaderboard,
    error: leaderboardError,
  } =
    await supabase
      .from(
        'leaderboard_entries'
      )
      .select(`
        player_id,
        alias,
        mission_1_score,
        mission_2_score,
        mission_3_score,
        mission_4_score,
        total_score,
        completed_count
      `)
      .eq(
        'player_id',
        user.id
      )
      .maybeSingle();


  if (
    leaderboardError
  ) {
    console.error(
      '[DASHBOARD] Unable to load leaderboard entry:',
      leaderboardError
    );
  }


  // --------------------------------------------------
  // LOAD PLAYER ATTEMPTS
  // --------------------------------------------------

  const {
    data: attempts,
    error: attemptError,
  } =
    await supabase
      .from(
        'mission_attempts'
      )
      .select(`
        mission_id,
        status,
        current_stage,
        started_at,
        completed_at
      `)
      .eq(
        'player_id',
        user.id
      );


  if (
    attemptError
  ) {
    console.error(
      '[DASHBOARD] Unable to load attempts:',
      attemptError
    );
  }


  // --------------------------------------------------
  // CALCULATE OVERALL RANK
  // --------------------------------------------------

  let overallRank:
    number |
    null =
      null;


  if (
    leaderboard
  ) {
    const {
      count:
        playersAbove,
      error:
        rankError,
    } =
      await supabase
        .from(
          'leaderboard_entries'
        )
        .select(
          'player_id',
          {
            count:
              'exact',

            head:
              true,
          }
        )
        .gt(
          'total_score',
          leaderboard
            .total_score ??
            0
        );


    if (
      rankError
    ) {
      console.error(
        '[DASHBOARD] Unable to calculate rank:',
        rankError
      );
    } else {
      overallRank =
        (
          playersAbove ??
          0
        ) + 1;
    }
  }


  // --------------------------------------------------
  // BUILD SCORE + ATTEMPT MAPS
  // --------------------------------------------------

  const scoreMap =
    new Map<
      number,
      number
    >([
      [
        1,
        leaderboard
          ?.mission_1_score ??
          0,
      ],

      [
        2,
        leaderboard
          ?.mission_2_score ??
          0,
      ],

      [
        3,
        leaderboard
          ?.mission_3_score ??
          0,
      ],

      [
        4,
        leaderboard
          ?.mission_4_score ??
          0,
      ],
    ]);


  const attemptMap =
    new Map(
      (
        attempts ??
        []
      ).map(
        (
          attempt
        ) => [
          attempt
            .mission_id,

          attempt,
        ]
      )
    );


  const totalScore =
    leaderboard
      ?.total_score ??
    0;


  const now =
    new Date();


  // --------------------------------------------------
  // PLAYER DASHBOARD
  // --------------------------------------------------

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

      {/* HEADER */}

      <header className="flex flex-wrap items-start justify-between gap-5">

        <div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
            Cyber Defence Unit
          </p>


          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Welcome,{' '}
            {profile.alias}
          </h1>


          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--muted)]">

            <span>
              @{profile.username}
            </span>


            {profile.department && (
              <>
                <span>
                  •
                </span>

                <span>
                  {
                    profile.department
                  }
                </span>
              </>
            )}

          </div>

        </div>


        <div className="flex flex-wrap gap-2">

          <Link
            href="/profile"
            className="btn btn-secondary"
          >
            Profile
          </Link>


          <Link
            href="/leaderboard"
            className="btn btn-secondary"
          >
            Leaderboard
          </Link>


          <Link
            href="/intelligence"
            className="btn btn-secondary"
          >
            Intelligence Vault
          </Link>


          <SignOutButton />

        </div>

      </header>


      {/* PLAYER SUMMARY */}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="card p-5">

          <p className="text-sm text-[var(--muted)]">
            Total Score
          </p>


          <p className="mt-2 text-3xl font-black">
            {
              totalScore
                .toLocaleString()
            }
          </p>

        </div>


        <div className="card p-5">

          <p className="text-sm text-[var(--muted)]">
            Overall Rank
          </p>


          <p className="mt-2 text-3xl font-black">
            {
              overallRank
                ? `#${overallRank}`
                : '—'
            }
          </p>

        </div>


        <div className="card p-5">

          <p className="text-sm text-[var(--muted)]">
            Missions Completed
          </p>


          <p className="mt-2 text-3xl font-black">

            {
              leaderboard
                ?.completed_count ??
              (
                attempts ??
                []
              ).filter(
                (
                  attempt
                ) =>
                  attempt
                    .status ===
                  'submitted'
              ).length
            }

            /4

          </p>

        </div>


        <div className="card p-5">

          <p className="text-sm text-[var(--muted)]">
            Current Threat Level
          </p>


          <p className="mt-2 text-xl font-black text-amber-400">
            ELEVATED
          </p>

        </div>

      </section>


      {/* MISSIONS */}

      <section className="mt-10">

        <div className="mb-5">

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
            Operation Digital Shield
          </p>


          <h2 className="mt-1 text-2xl font-black">
            Mission Control
          </h2>


          <p className="mt-2 text-sm text-[var(--muted)]">
            New intelligence becomes available each Friday.
          </p>

        </div>


        {(missions ?? []).length > 0 && (
          <div className="mb-6">
            <UpcomingMission
              serverNow={now.toISOString()}
              missions={(missions ?? []).map(
                (mission) => ({
                  id: mission.id,
                  sequence: mission.sequence,
                  title: mission.title,
                  unlock_at: mission.unlock_at,
                  status: mission.status,
                  finale: mission.finale,
                })
              )}
            />
          </div>
        )}


        <div className="grid gap-5 lg:grid-cols-2">

          {(
            missions ??
            []
          ).map(
            (
              mission
            ) => {

              const attempt =
                attemptMap.get(
                  mission.id
                );


              const score =
                scoreMap.get(
                  mission.id
                );


              const unlockDate =
                new Date(
                  mission.unlock_at
                );


              const timeUnlocked =
                now >=
                unlockDate;


              const forcedOpen =
                mission.status ===
                  'forced_open' ||
                mission.status ===
                  'live' ||
                mission.status ===
                  'open';


              const closed =
                mission.status ===
                'closed';


              const emergencyLocked =
                mission.status ===
                'emergency_locked';


              const available =
                !closed &&
                !emergencyLocked &&
                (
                  forcedOpen ||
                  timeUnlocked ||
                  profile.is_tester
                );


              const complete =
                attempt
                  ?.status ===
                'submitted';


              const active =
                attempt
                  ?.status ===
                'active';


              let statusText =
                'LOCKED';


              // Admin release state always wins over a
              // player's own unsubmitted attempt — otherwise
              // a mission the admin just closed can still
              // read as "IN PROGRESS" on the player dashboard.
              if (
                complete
              ) {
                statusText =
                  'COMPLETE';
              } else if (
                closed
              ) {
                statusText =
                  'CLOSED';
              } else if (
                emergencyLocked
              ) {
                statusText =
                  'EMERGENCY LOCKED';
              } else if (
                active
              ) {
                statusText =
                  'IN PROGRESS';
              } else if (
                available
              ) {
                statusText =
                  'AVAILABLE';
              }


              // ----------------------------------
              // MISSION ROUTES
              //
              // All missions now consistently use:
              //
              // Open:
              // /missions/{id}/play
              //
              // Resume:
              // /missions/{id}/play
              //
              // Result:
              // /missions/{id}/play/report
              // ----------------------------------

              const missionPlayHref =
                `/missions/${mission.id}/play`;


              const resultHref =
                `/missions/${mission.id}/play/report`;


              return (
                <article
                  key={
                    mission.id
                  }
                  className="card overflow-hidden"
                >

                  <div className="border-b border-[var(--line)] p-5">

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">

                          Mission{' '}

                          {
                            String(
                              mission.sequence
                            ).padStart(
                              2,
                              '0'
                            )
                          }

                        </p>


                        <h3 className="mt-2 text-xl font-black">
                          {
                            mission.title
                          }
                        </h3>

                      </div>


                      <span className="badge">
                        {
                          statusText
                        }
                      </span>

                    </div>

                  </div>


                  <div className="p-5">

                    <div className="grid grid-cols-2 gap-4 text-sm">

                      <div>

                        <p className="text-[var(--muted)]">
                          Max Score
                        </p>


                        <p className="mt-1 font-bold">

                          {
                            mission
                              .max_score
                              .toLocaleString()
                          }

                        </p>

                      </div>


                      <div>

                        <p className="text-[var(--muted)]">
                          Your Score
                        </p>


                        <p className="mt-1 font-bold">

                          {
                            score != null
                              ? score
                                  .toLocaleString()
                              : '—'
                          }

                        </p>

                      </div>

                    </div>


                    {!available &&
                      !complete &&
                      !closed &&
                      !emergencyLocked && (

                        <div className="mt-5 rounded-xl border border-[var(--line)] bg-[#07141d] p-4">

                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                            Intelligence Release
                          </p>


                          <p className="mt-2 text-sm">

                            {
                              unlockDate
                                .toLocaleString(
                                  'en-JM',
                                  {
                                    dateStyle:
                                      'long',

                                    timeStyle:
                                      'short',

                                    timeZone:
                                      'America/Jamaica',
                                  }
                                )
                            }

                          </p>

                        </div>

                      )}


                    <div className="mt-5">

                      {complete ? (

                        <Link
                          href={
                            resultHref
                          }
                          className="btn btn-secondary"
                        >
                          View Result
                        </Link>

                      ) : closed ||
                        emergencyLocked ? (

                        <button
                          type="button"
                          disabled
                          className="btn btn-secondary opacity-50"
                        >
                          {closed
                            ? 'Mission Closed'
                            : 'Emergency Locked'}
                        </button>

                      ) : active ? (

                        <Link
                          href={
                            missionPlayHref
                          }
                          className="btn btn-primary"
                        >
                          Resume Mission
                        </Link>

                      ) : available ? (

                        <Link
                          href={
                            missionPlayHref
                          }
                          className="btn btn-primary"
                        >
                          Open Mission
                        </Link>

                      ) : (

                        <button
                          type="button"
                          disabled
                          className="btn btn-secondary opacity-50"
                        >
                          Mission Locked
                        </button>

                      )}

                    </div>

                  </div>

                </article>
              );
            }
          )}

        </div>

      </section>

    </main>
  );
}