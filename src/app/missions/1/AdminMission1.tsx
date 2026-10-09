import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function fmt(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-JM', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Jamaica',
  }).format(new Date(value));
}

export default async function AdminMissionOnePage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: attempts }, { data: profiles }, { data: reports }] = await Promise.all([
    admin
      .from('mission_attempts')
      .select('player_id,status,current_stage,started_at,completed_at')
      .eq('mission_id', 1)
      .order('started_at', { ascending: false }),
    admin
      .from('profiles')
      .select('id,username,alias,department,is_active,role'),
    admin
      .from('mission_breach_reports')
      .select('player_id,total_score,evidence_score,theory_score,containment_score,bonus_score,submitted_at')
      .eq('mission_id', 1),
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const reportMap = new Map((reports ?? []).map((report) => [report.player_id, report]));

  const started = attempts?.length ?? 0;
  const completed = (attempts ?? []).filter((attempt) => attempt.status === 'submitted').length;
  const active = started - completed;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Admin • Mission 01</p>
          <h1 className="mt-2 text-3xl font-black">The Breach — Live Status</h1>
          <p className="mt-2 text-[var(--muted)]">Read-only operational view of player progress and official scores.</p>
        </div>
      </div>

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-sm text-[var(--muted)]">Started</p><p className="mt-2 text-3xl font-black">{started}</p></div>
        <div className="card p-5"><p className="text-sm text-[var(--muted)]">Active</p><p className="mt-2 text-3xl font-black">{active}</p></div>
        <div className="card p-5"><p className="text-sm text-[var(--muted)]">Completed</p><p className="mt-2 text-3xl font-black">{completed}</p></div>
      </section>

      <section className="card mt-7 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-xs uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Completed</th>
            </tr>
          </thead>
          <tbody>
            {(attempts ?? []).map((attempt) => {
              const profile = profileMap.get(attempt.player_id);
              const report = reportMap.get(attempt.player_id);
              return (
                <tr key={attempt.player_id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-4"><p className="font-bold">{profile?.alias ?? 'No alias'}</p><p className="text-xs text-[var(--muted)]">@{profile?.username ?? 'unknown'}</p></td>
                  <td className="px-4 py-4">{profile?.department ?? '—'}</td>
                  <td className="px-4 py-4 font-bold">{attempt.status}</td>
                  <td className="px-4 py-4">{attempt.current_stage ?? '—'}</td>
                  <td className="px-4 py-4 font-black">{report ? `${report.total_score}/1500` : '—'}</td>
                  <td className="px-4 py-4">{fmt(attempt.started_at)}</td>
                  <td className="px-4 py-4">{fmt(attempt.completed_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
