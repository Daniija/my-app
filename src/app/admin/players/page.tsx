import AdminPlayerActions from '@/components/AdminPlayerActions';
import {
  AdminOnlineProvider,
  OnlineDot,
} from '@/components/admin/AdminOnlineProvider';
import { requireAdmin } from '@/lib/admin';
import { isOnline } from '@/lib/presence';

export default async function PlayersPage() {
  const { supabase } = await requireAdmin();

  const { data: players } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      alias,
      department,
      role,
      is_active,
      onboarding_complete,
      must_change_password,
      created_at,
      last_seen_at
    `)
    .order('created_at', {
      ascending: true,
    });

  const initialOnlineIds = (players ?? [])
    .filter((p) => isOnline(p.last_seen_at))
    .map((p) => p.id);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <span className="badge">
        PLAYER MANAGEMENT
      </span>

      <h1 className="mt-3 text-4xl font-black">
        Accounts
      </h1>

      <p className="muted mt-2">
        Activate or suspend accounts, reset player passwords,
        and manage privileged admin roles.
      </p>

      <AdminOnlineProvider initialOnlineIds={initialOnlineIds}>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--line)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#07141d] text-[var(--muted)]">
            <tr>
              <th className="p-3">
                Username
              </th>

              <th className="p-3">
                Alias
              </th>

              <th className="p-3">
                Department
              </th>

              <th className="p-3">
                Role
              </th>

              <th className="p-3">
                Status
              </th>

              <th className="p-3">
                Onboarding
              </th>

              <th className="p-3">
                Password
              </th>

              <th className="p-3">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {players?.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profile row is returned untyped from Supabase
              (p: any) => (
                <tr
                  className="border-t border-[var(--line)] align-top"
                  key={p.id}
                >
                  <td className="p-3 font-mono">
                    <span className="inline-flex items-center gap-2">
                      <OnlineDot playerId={p.id} />
                      {p.username || '—'}
                    </span>
                  </td>

                  <td className="p-3 font-bold">
                    {p.alias || 'Not chosen'}
                  </td>

                  <td className="p-3">
                    {p.department || '—'}
                  </td>

                  <td className="p-3">
                    <span className="badge">
                      {p.role}
                    </span>
                  </td>

                  <td className="p-3">
                    {p.is_active
                      ? 'Active'
                      : 'Disabled'}
                  </td>

                  <td className="p-3">
                    {p.onboarding_complete
                      ? 'Complete'
                      : 'Pending'}
                  </td>

                  <td className="p-3">
                    {p.must_change_password
                      ? (
                        <span className="font-bold text-amber-400">
                          Must change
                        </span>
                      )
                      : (
                        <span className="muted">
                          Normal
                        </span>
                      )}
                  </td>

                  <td className="p-3">
                    <AdminPlayerActions
                      playerId={p.id}
                      active={p.is_active}
                      role={p.role}
                      alias={p.alias}
                      username={p.username}
                    />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      </AdminOnlineProvider>
    </main>
  );
}