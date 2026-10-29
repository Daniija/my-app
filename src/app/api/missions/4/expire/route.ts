import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeRemainingSeconds, isExpired } from '@/lib/missions/mission-four-scoring';

// Client-triggered fast-path only -- NOT a second source of truth.
// Re-derives expiry server-side using the exact same formula
// requireMissionFourStage() and the two RPCs already independently
// check. If the server's own clock disagrees (client clock skew),
// this returns expired:false and the client just keeps ticking;
// every later page load and RPC call still re-checks for itself.
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { code: 'AUTH_REQUIRED', message: 'You must be signed in.' },
      { status: 401 }
    );
  }

  const { data: attempt } = await supabase
    .from('mission_attempts')
    .select('id, status, current_stage')
    .eq('player_id', user.id)
    .eq('mission_id', 4)
    .maybeSingle();

  if (!attempt) {
    return NextResponse.json({ message: 'Mission attempt not found.' }, { status: 404 });
  }

  if (attempt.status === 'submitted' || attempt.current_stage === 'report') {
    return NextResponse.json(
      { expired: true, nextStage: 'report' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { data: progressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attempt.id)
    .maybeSingle();

  const progress = (progressRow?.progress as Record<string, unknown>) ?? {};
  const timer = (progress.timer as { startedAt?: string; netAdjustmentSeconds?: number }) ?? {};

  if (!timer.startedAt) {
    return NextResponse.json(
      { expired: false },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const remaining = computeRemainingSeconds({
    startedAtMs: new Date(timer.startedAt).getTime(),
    netAdjustmentSeconds: timer.netAdjustmentSeconds ?? 0,
    nowMs: Date.now(),
  });

  if (!isExpired(remaining)) {
    return NextResponse.json(
      { expired: false },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const admin = createAdminClient();

  await admin
    .from('mission_progress')
    .update({
      progress: { ...progress, report: { outcome: 'failed', reason: 'time_expired' } },
      updated_at: new Date().toISOString(),
    })
    .eq('attempt_id', attempt.id);

  await admin
    .from('mission_attempts')
    .update({ current_stage: 'report', status: 'submitted' })
    .eq('id', attempt.id);

  return NextResponse.json(
    { expired: true, nextStage: 'report' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
