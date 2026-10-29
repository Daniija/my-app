import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getStageCompletion, submitMissionFourStage } from '@/lib/missions/mission-four-submit';
import { getMissionFourStage } from '@/lib/missions/mission-four-data';

// Finalizes CONTAIN once every one of its challenges has a saved
// result. Advances current_stage: contain -> disarm. See
// triage/finalize/route.ts for the shared pattern this mirrors.
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

  const completion = await getStageCompletion(supabase, attempt.id, 'contain');

  if (!completion.complete) {
    return NextResponse.json(
      { message: 'Complete every challenge before continuing.', missing: completion.missing },
      { status: 400 }
    );
  }

  const stageDefinition = getMissionFourStage('contain');

  return submitMissionFourStage({
    fromStage: 'contain',
    toStage: 'disarm',
    toStatus: 'active',
    buildResult: () => ({
      outcome: 'correct',
      points: completion.totalPoints + stageDefinition.completionBonus,
    }),
  });
}
