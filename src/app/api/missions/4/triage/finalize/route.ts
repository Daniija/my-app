import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getStageCompletion, submitMissionFourStage } from '@/lib/missions/mission-four-submit';
import { getMissionFourStage } from '@/lib/missions/mission-four-data';

// Finalizes TRIAGE once every one of its challenges has a saved
// result -- the same two-tier "per-item save, then finalize" pattern
// Mission 03's voice section uses (save_mission_three_voice_round +
// voice/submit). Advances current_stage: triage -> trace.
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
    .select('id')
    .eq('player_id', user.id)
    .eq('mission_id', 4)
    .maybeSingle();

  if (!attempt) {
    return NextResponse.json({ message: 'Mission attempt not found.' }, { status: 404 });
  }

  const completion = await getStageCompletion(supabase, attempt.id, 'triage');

  if (!completion.complete) {
    return NextResponse.json(
      { message: 'Complete every challenge before continuing.', missing: completion.missing },
      { status: 400 }
    );
  }

  const stageDefinition = getMissionFourStage('triage');

  return submitMissionFourStage({
    fromStage: 'triage',
    toStage: 'trace',
    toStatus: 'active',
    buildResult: () => ({
      outcome: 'correct',
      points: completion.totalPoints + stageDefinition.completionBonus,
    }),
  });
}
