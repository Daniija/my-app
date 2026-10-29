import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  computeRemainingSeconds,
  isExpired,
  MISSION_FOUR_DURATION_SECONDS,
} from './mission-four-scoring';

// The full Mission 04 progression. Stage pages gate against this
// order so a player can neither skip ahead nor get stuck behind
// their own saved progress on refresh/navigation -- same role as
// mission-three-stage-page.ts's MISSION_THREE_STAGE_ORDER.
export const MISSION_FOUR_STAGE_ORDER = [
  'briefing',
  'triage',
  'trace',
  'contain',
  'disarm',
  'report',
] as const;

export type MissionFourStageName = (typeof MISSION_FOUR_STAGE_ORDER)[number];

export function missionFourStagePath(stage: MissionFourStageName) {
  if (stage === 'briefing') {
    return '/missions/4/play';
  }

  return `/missions/4/play/${stage}`;
}

export type MissionFourUiState =
  | 'READY'
  | 'ACTIVE'
  | 'SUCCESS'
  | 'FAILED';

// Derives the player-visible state purely from server data -- READY
// (no attempt, or still at briefing), ACTIVE (any of the 4 stages),
// or SUCCESS/FAILED (current_stage='report', status='submitted',
// distinguished by progress.report.outcome). BRIEFING and
// STAGE_COMPLETE are deliberately not represented here: BRIEFING is a
// brief client-only flag between clicking START and the begin-call
// resolving, and STAGE_COMPLETE is a transient client overlay shown
// immediately after a successful submit response, before navigating
// -- neither ever needs a durable server value, mirroring how Mission
// 03's per-round result screens work today.
export function deriveMissionFourUiState(
  attempt: { current_stage: string | null; status: string } | null,
  progress: Record<string, unknown> | null
): MissionFourUiState {
  if (!attempt || attempt.current_stage === 'briefing' || !attempt.current_stage) {
    return 'READY';
  }

  if (attempt.current_stage === 'report') {
    const report = progress?.report as { outcome?: string } | undefined;
    return report?.outcome === 'failed' ? 'FAILED' : 'SUCCESS';
  }

  return 'ACTIVE';
}

type MissionFourAttempt = {
  id: string;
  status: string;
  current_stage: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type MissionFourStageGate = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  attempt: MissionFourAttempt;
  playerAlias: string;
  timer: {
    startedAt: string | null;
    netAdjustmentSeconds: number;
  };
};

// Runs the auth -> profile -> onboarding -> workgroup -> attempt
// chain shared by every Mission 04 stage page, then gates on the
// requested stage -- mirrors requireMissionThreeStage() exactly, plus
// one addition: it recomputes remaining time server-side on every
// load and finalizes FAILED *before rendering* if time has already
// run out, so a player can never dodge failure by simply not calling
// an endpoint. The two RPCs (migration 020) independently re-check
// this same condition after taking their row lock, so this check here
// is a fast, read-only convenience redirect, not the sole authority.
export async function requireMissionFourStage(
  stage: MissionFourStageName
): Promise<MissionFourStageGate> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,alias,role,is_active,onboarding_complete,work_location_type')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[MISSION 04 STAGE] Unable to load profile:', profileError);
    redirect('/login');
  }

  if (!profile.is_active) {
    redirect('/login');
  }

  if (profile.role === 'admin') {
    redirect('/admin');
  }

  if (!profile.onboarding_complete) {
    redirect('/onboarding');
  }

  if (!profile.work_location_type) {
    redirect('/select-workgroup');
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('mission_attempts')
    .select('id,status,current_stage,started_at,completed_at')
    .eq('player_id', user.id)
    .eq('mission_id', 4)
    .maybeSingle();

  if (attemptError) {
    console.error('[MISSION 04 STAGE] Unable to load attempt:', attemptError);
  }

  if (!attempt) {
    redirect('/missions/4/play');
  }

  if (attempt.status === 'submitted' || attempt.current_stage === 'report') {
    redirect('/missions/4/play/report');
  }

  const { data: progressRow } = await supabase
    .from('mission_progress')
    .select('progress')
    .eq('attempt_id', attempt.id)
    .maybeSingle();

  const progress = (progressRow?.progress as Record<string, unknown>) ?? {};
  const timer = (progress.timer as { startedAt?: string; netAdjustmentSeconds?: number }) ?? {};

  if (timer.startedAt) {
    const remaining = computeRemainingSeconds({
      startedAtMs: new Date(timer.startedAt).getTime(),
      netAdjustmentSeconds: timer.netAdjustmentSeconds ?? 0,
      nowMs: Date.now(),
      durationSeconds: MISSION_FOUR_DURATION_SECONDS,
    });

    if (isExpired(remaining) && attempt.current_stage !== 'report') {
      const admin = createAdminClient();

      await admin
        .from('mission_progress')
        .update({
          progress: {
            ...progress,
            report: { outcome: 'failed', reason: 'time_expired' },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('attempt_id', attempt.id);

      await admin
        .from('mission_attempts')
        .update({ current_stage: 'report', status: 'submitted' })
        .eq('id', attempt.id);

      redirect('/missions/4/play/report');
    }
  }

  // Unlike Mission 03's transmission page, no Mission 04 stage page
  // performs its own self-advance while current_stage is still
  // 'briefing' -- the briefing screen itself (/missions/4/play) never
  // calls this gate, so every caller here can require an exact match.
  const currentStage = (attempt.current_stage ?? 'briefing') as MissionFourStageName;

  if (currentStage !== stage) {
    redirect(missionFourStagePath(currentStage));
  }

  return {
    supabase,
    attempt,
    playerAlias: profile.alias ?? 'Agent',
    timer: {
      startedAt: timer.startedAt ?? null,
      netAdjustmentSeconds: timer.netAdjustmentSeconds ?? 0,
    },
  };
}
