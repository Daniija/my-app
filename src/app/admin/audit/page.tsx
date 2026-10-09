import { redirect } from 'next/navigation';

import AdminAuditLog, {
  type AuditLogRow,
} from '@/components/admin/AdminAuditLogs';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const supabase = await createClient();

  // ----------------------------------
  // VERIFY ADMIN
  // ----------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      alias,
      role,
      is_active
    `)
    .eq('id', user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.is_active
  ) {
    redirect('/login');
  }

  if (profile.role !== 'admin') {
    redirect('/dashboard');
  }

  // ----------------------------------
  // LOAD AUDIT EVENTS SERVER-SIDE
  // ----------------------------------

  const admin =
    createAdminClient();

  const {
    data: logs,
    error: auditError,
  } = await admin
    .from('audit_logs')
    .select(`
      id,
      actor_id,
      actor_alias,
      actor_role,
      action,
      target_type,
      target_id,
      description,
      metadata,
      created_at
    `)
    .order('created_at', {
      ascending: false,
    })
    .limit(500);

  if (auditError) {
    console.error(
      '[ADMIN AUDIT] Unable to load audit log:',
      auditError
    );
  }

  const auditRows =
    (logs ?? []) as AuditLogRow[];

  const last24Hours =
    auditRows.filter(
      (log) =>
        Date.now() -
          new Date(
            log.created_at
          ).getTime() <=
        24 * 60 * 60 * 1000
    ).length;

  const securityEvents =
    auditRows.filter(
      (log) =>
        log.action.includes(
          'DISABLED'
        ) ||
        log.action.includes(
          'EMERGENCY'
        ) ||
        log.action.includes(
          'FAILED'
        )
    ).length;

  const missionEvents =
    auditRows.filter(
      (log) =>
        log.target_type ===
        'mission'
    ).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
          Cyber Defence Unit
        </p>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">
              Audit Log
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Security, administrative and mission
              activity recorded across the Cyber
              Defence Unit system.
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Administrator
            </p>

            <p className="mt-1 font-bold">
              {profile.alias ??
                profile.username ??
                'Admin'}
            </p>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-[#061019] p-5">
          <p className="text-sm text-slate-500">
            Loaded Events
          </p>

          <p className="mt-2 text-3xl font-black">
            {auditRows.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#061019] p-5">
          <p className="text-sm text-slate-500">
            Last 24 Hours
          </p>

          <p className="mt-2 text-3xl font-black text-cyan-300">
            {last24Hours}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#061019] p-5">
          <p className="text-sm text-slate-500">
            Mission Events
          </p>

          <p className="mt-2 text-3xl font-black text-emerald-300">
            {missionEvents}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#061019] p-5">
          <p className="text-sm text-slate-500">
            Security Alerts
          </p>

          <p className="mt-2 text-3xl font-black text-red-300">
            {securityEvents}
          </p>
        </div>
      </section>

      {auditError ? (
        <section className="mt-8 rounded-2xl border border-red-900 bg-red-950/20 p-6">
          <p className="font-black text-red-300">
            Audit data could not be loaded.
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Make sure the audit_logs table has
            been created using the supplied SQL
            migration.
          </p>
        </section>
      ) : (
        <section className="mt-8">
          <AdminAuditLog
            logs={auditRows}
          />
        </section>
      )}
    </main>
  );
}
