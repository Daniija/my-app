import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Stamps profiles.last_seen_at for the signed-in user. Called every
// PRESENCE_HEARTBEAT_INTERVAL_MS by PresenceHeartbeat.tsx while the app
// is open. Deliberately no audit logging here -- a 30s heartbeat would
// flood the audit log, and this isn't a security-relevant action.
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('[PRESENCE HEARTBEAT] Update failed:', error);

      return NextResponse.json(
        { message: 'Unable to record heartbeat.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PRESENCE HEARTBEAT] Unexpected error:', error);

    return NextResponse.json(
      { message: 'Unable to record heartbeat.' },
      { status: 500 }
    );
  }
}
