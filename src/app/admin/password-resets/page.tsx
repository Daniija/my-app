import Link from 'next/link';

import PasswordResetAdminList from '@/components/admin/PasswordResetAdminList';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic =
  'force-dynamic';

export default async function PasswordResetsPage() {
  await requireAdmin();

  const admin =
    createAdminClient();

  const {
    data: requests,
    error,
  } = await admin
    .from(
      'password_reset_requests'
    )
    .select(`
      id,
      player_id,
      status,
      requested_at,
      profiles!password_reset_requests_player_id_fkey (
        username,
        alias,
        is_active
      )
    `)
    .eq(
      'status',
      'pending'
    )
    .order(
      'requested_at',
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      '[ADMIN PASSWORD RESETS]',
      error
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge">
            ADMIN
          </span>

          <h1 className="mt-3 text-3xl font-black">
            Password Reset Requests
          </h1>

          <p className="muted mt-2">
            Issue a temporary password
            to players who requested
            account recovery.
          </p>
        </div>

        <Link
          href="/admin"
          className="btn btn-secondary"
        >
          ← Mission Control
        </Link>
      </div>

      <section className="mt-7">
        <PasswordResetAdminList
          initialRequests={
            (requests ??
              []) as any
          }
        />
      </section>
    </main>
  );
}