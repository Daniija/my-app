import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// The full Mission 03 progression. Stage pages gate against this
// order so a player can neither skip ahead nor get stuck behind
// their own saved progress on refresh/navigation.
export const MISSION_THREE_STAGE_ORDER = [
  'briefing',
  'transmission',
  'voice',
  'email',
  'verification',
  'final',
  'report',
] as const;

export type MissionThreeStageName =
  (typeof MISSION_THREE_STAGE_ORDER)[number];

export function missionThreeStagePath(stage: MissionThreeStageName) {
  if (stage === 'briefing') {
    return '/missions/3/play';
  }

  return `/missions/3/play/${stage}`;
}

type MissionThreeAttempt = {
  id: string;
  status: string;
  current_stage: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type MissionThreeStageGate = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  attempt: MissionThreeAttempt;
  playerAlias: string;
};

// Runs the auth -> profile -> onboarding -> workgroup -> attempt
// chain shared by every Mission 03 stage page (the same chain used
// by /missions/3/play, /missions/1/play/* and /missions/2/play/*),
// then gates on the requested stage:
//
// - "transmission" is a special case: it is reached directly from
//   the briefing's client-side navigation (no API call in between),
//   so it is allowed to load while current_stage is still null/
//   "briefing" -- the transmission page performs that one advance
//   itself. Every stage after it (including "voice") requires its
//   own completion API to have already advanced current_stage.
// - every other stage requires current_stage to already equal the
//   requested stage (set by the previous stage's submit route via
//   advance_mission_three_stage()). If the player hasn't reached it
//   yet, or has already moved past it, they are redirected to
//   wherever their attempt actually is.
export async function requireMissionThreeStage(
  stage: MissionThreeStageName
): Promise<MissionThreeStageGate> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id,alias,role,is_active,onboarding_complete,work_location_type'
    )
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error(
      '[MISSION 03 STAGE] Unable to load profile:',
      profileError
    );

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
    .eq('mission_id', 3)
    .maybeSingle();

  if (attemptError) {
    console.error(
      '[MISSION 03 STAGE] Unable to load attempt:',
      attemptError
    );
  }

  if (!attempt) {
    redirect('/missions/3/play');
  }

  if (attempt.status === 'submitted' || attempt.current_stage === 'report') {
    redirect('/missions/3/play/report');
  }

  const isPreTransmissionEntry =
    stage === 'transmission' &&
    (attempt.current_stage === null || attempt.current_stage === 'briefing');

  if (!isPreTransmissionEntry) {
    const currentStage = (attempt.current_stage ??
      'briefing') as MissionThreeStageName;

    if (currentStage !== stage) {
      redirect(missionThreeStagePath(currentStage));
    }
  }

  return {
    supabase,
    attempt,
    playerAlias: profile.alias ?? 'Agent',
  };
}
