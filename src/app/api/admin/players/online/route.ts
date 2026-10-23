import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { PRESENCE_ONLINE_THRESHOLD_SECONDS } from '@/lib/presence';

export const dynamic = 'force-dynamic';

// Polled every ~15s by AdminOnlineProvider on /admin/players to refresh
// the green "online now" dots without a full page reload. Read-only --
// no audit logging, same reasoning as the heartbeat route itself.
export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();

  const thresholdIso = new Date(
    Date.now() - PRESENCE_ONLINE_THRESHOLD_SECONDS * 1000
  ).toISOString();

  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .gte('last_seen_at', thresholdIso);

  if (error) {
    console.error('[ADMIN PLAYERS ONLINE] Lookup failed:', error);

    return NextResponse.json(
      { error: 'Unable to load online players.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { onlineIds: (data ?? []).map((row) => row.id) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
