import Link from 'next/link';
import AdminMissionControls from '@/components/AdminMissionControls';
import MissionScheduleButton from '@/components/admin/MissionScheduleButton';
import AdminResetStuckAttempts from '@/components/admin/AdminResetStuckAttempts';
import AdminResetAllAttempts from '@/components/admin/AdminResetAllAttempts';
import { requireAdmin } from '@/lib/admin';
import MissionStatusBadge from '@/components/admin/MissionStatusBadge';

export default async function AdminPage() {
  const { supabase } = await requireAdmin();

  const [
    { count: players },
    { count: activePlayers },
    { count: attempts },
    { count: completed },
    { data: missions },
    { data: recentScores },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'player'),

    supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'player')
      .eq('is_active', true),

    supabase
      .from('mission_attempts')
      .select('*', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('mission_attempts')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'submitted'),

    supabase
      .from('missions')
      .select('*')
      .order('sequence'),

    supabase
      .from('mission_scores')
      .select(
        'total_score,mission_id,created_at,profiles(alias)'
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(5),
  ]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="badge">
            ADMIN
          </span>

          <h1 className="mt-3 text-4xl font-black">
            Mission Control
          </h1>

          <p className="muted mt-2">
            Manage players, mission release states,
            schedules, and live competition activity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="btn btn-secondary"
            href="/admin/players"
          >
            Manage players
          </Link>

          <Link
            className="btn btn-secondary"
            href="/leaderboard"
            target="_blank"
          >
            Open live board
          </Link>

          <Link
            className="btn btn-secondary"
            href="/admin/leaderboard"
          >
            Leaderboard Times
          </Link>

          <Link
            className="btn btn-secondary"
            href="/admin/password-resets"
          >
            Password Resets
          </Link>

          <Link
            className="btn btn-secondary"
            href="/admin/org-options"
          >
            Departments &amp; Branches
          </Link>
        </div>
      </div>

      {/* SUMMARY */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Registered players"
          value={players ?? 0}
        />

        <Stat
          label="Active players"
          value={activePlayers ?? 0}
        />

        <Stat
          label="Mission attempts"
          value={attempts ?? 0}
        />

        <Stat
          label="Completed attempts"
          value={completed ?? 0}
        />
      </section>

      {/* MISSION SCHEDULE */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-cyan-300">
              MISSION SCHEDULE
            </p>

            <h2 className="text-2xl font-black">
              Release controls
            </h2>

            <p className="muted mt-1 text-sm">
              Open, lock, close, or change the scheduled
              release date and time for each mission.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {missions?.map((m) => (
            <article
              className="card p-5"
              key={m.id}
            >
              {/* MISSION HEADER */}
              <div className="flex justify-between gap-3">
                <div>
                  <p className="muted text-xs">
                    MISSION{' '}
                    {String(m.sequence).padStart(
                      2,
                      '0'
                    )}
                  </p>

                  <p className="text-xl font-black">
                    {m.title}
                  </p>
                </div>

                <MissionStatusBadge
                  status={m.status}
                  unlockAt={m.unlock_at}
                />
              </div>

              {/* MISSION DETAILS */}
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--line)] bg-[#07141d] p-3">
                  <dt className="muted">
                    Current unlock
                  </dt>

                  <dd className="mt-1 font-bold">
                    {m.unlock_at
                      ? new Date(
                          m.unlock_at
                        ).toLocaleString(
                          'en-JM',
                          {
                            dateStyle:
                              'medium',
                            timeStyle:
                              'short',
                            timeZone:
                              'America/Jamaica',
                          }
                        )
                      : 'Not scheduled'}
                  </dd>
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[#07141d] p-3">
                  <dt className="muted">
                    Max score
                  </dt>

                  <dd className="mt-1 font-bold">
                    {m.max_score}
                  </dd>
                </div>
              </dl>

              {/* RELEASE CONTROLS */}
              <div className="mt-5">
                <p className="mb-2 text-xs font-bold tracking-[0.14em] text-cyan-300">
                  RELEASE STATE
                </p>

                <AdminMissionControls
                  missionId={m.id}
                  current={m.status}
                />
              </div>

              {/* SCHEDULE BUTTON */}
              <div className="mt-5">
                <MissionScheduleButton
                  missionId={m.id}
                  missionTitle={m.title}
                  unlockAt={m.unlock_at}
                />
              </div>

              {/* RESET STUCK ATTEMPTS */}
              <div className="mt-5 border-t border-[var(--line)] pt-5">
                <p className="mb-2 text-xs font-bold tracking-[0.14em] text-red-400">
                  TROUBLESHOOTING
                </p>

                <div className="flex flex-wrap gap-2">
                  <AdminResetStuckAttempts
                    missionId={m.id}
                    missionTitle={m.title}
                  />

                  <AdminResetAllAttempts
                    missionId={m.id}
                    missionTitle={m.title}
                  />
                </div>

                <p className="muted mt-2 text-xs">
                  &quot;Reset Stuck Attempts&quot; only resets players still
                  stuck at the briefing screen with zero progress.
                  &quot;Reset All Attempts&quot; resets every in-progress attempt
                  for {m.title} no matter the stage -- both leave anyone who
                  has already fully completed it untouched.
                </p>
              </div>

              {/* ADMIN PREVIEW - ALL MISSIONS */}
              <div className="mt-5 border-t border-[var(--line)] pt-5">
                <p className="mb-2 text-xs font-bold tracking-[0.14em] text-amber-300">
                  ADMIN TESTING
                </p>

                <Link
                  href={`/admin/missions/${m.id}/preview`}
                  className="btn btn-secondary"
                >
                  Preview Mission{' '}
                  {String(m.sequence).padStart(2, '0')}
                </Link>

                <p className="muted mt-2 text-xs">
                  Preview Mission{' '}
                  {String(m.sequence).padStart(2, '0')} without
                  changing its release status or affecting
                  player progress, scores, or the leaderboard.
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="mt-8 card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-cyan-300">
              LATEST ACTIVITY
            </p>

            <h2 className="text-2xl font-black">
              Recent scores
            </h2>
          </div>

          <Link
            className="btn btn-secondary"
            href="/admin/audit"
          >
            View audit log
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {recentScores?.length ? (
            recentScores.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- score row is returned untyped from Supabase
              (row: any) => (
                <div
                  key={`${row.mission_id}-${row.created_at}-${row.total_score}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] p-3"
                >
                  <div>
                    <p className="font-bold">
                      {row.profiles?.alias ||
                        'Unassigned player'}
                    </p>

                    <p className="muted text-sm">
                      Mission {row.mission_id}
                      {' · '}
                      {new Date(
                        row.created_at
                      ).toLocaleString(
                        'en-JM',
                        {
                          dateStyle:
                            'medium',
                          timeStyle:
                            'short',
                          timeZone:
                            'America/Jamaica',
                        }
                      )}
                    </p>
                  </div>

                  <p className="text-xl font-black">
                    {row.total_score}
                  </p>
                </div>
              )
            )
          ) : (
            <p className="muted">
              No completed mission scores yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="card p-4">
      <p className="muted text-sm">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}