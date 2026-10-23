import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';

export type MissionThreeStageResult = {
  outcome: 'correct' | 'partial' | 'incorrect';
  points: number;
  [key: string]: unknown;
};

type BuildResultOutcome =
  | MissionThreeStageResult
  | { error: string };

// Shared submit mechanics for every Mission 03 stage route: auth,
// load the attempt, confirm it's actually at the expected stage,
// then hand off to advance_mission_three_stage() (the atomic,
// row-locked RPC added in migration 009) to persist the score and
// advance current_stage. Answer validation and point computation
// stay in each route's `buildResult`, keeping all business logic in
// TypeScript rather than duplicated in SQL.
export async function submitMissionThreeStage({
  fromStage,
  toStage,
  toStatus,
  buildResult,
}: {
  fromStage: string;
  toStage: string;
  toStatus: 'active' | 'submitted';
  buildResult: () => BuildResultOutcome;
}) {
  let authedUserId: string | null = null;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          code: 'AUTH_REQUIRED',
          message: 'You must be signed in.',
        },
        { status: 401 }
      );
    }

    authedUserId = user.id;

    const outcome = buildResult();

    if ('error' in outcome) {
      return NextResponse.json(
        { message: outcome.error },
        { status: 400 }
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('mission_attempts')
      .select('id, status, current_stage')
      .eq('player_id', user.id)
      .eq('mission_id', 3)
      .maybeSingle();

    if (attemptError || !attempt) {
      console.error(
        '[MISSION 03 SUBMIT] Attempt lookup failed:',
        attemptError
      );

      return NextResponse.json(
        { message: 'Mission attempt not found.' },
        { status: 404 }
      );
    }

    if (
      attempt.status !== 'active' ||
      attempt.current_stage !== fromStage
    ) {
      return NextResponse.json(
        {
          message:
            'This stage is not currently active for your attempt.',
        },
        { status: 409 }
      );
    }

    const { data: progress, error: rpcError } = await supabase.rpc(
      'advance_mission_three_stage',
      {
        p_attempt_id: attempt.id,
        p_from_stage: fromStage,
        p_to_stage: toStage,
        p_to_status: toStatus,
        p_stage_key: fromStage,
        p_stage_result: outcome,
      }
    );

    if (rpcError) {
      console.error(
        '[MISSION 03 SUBMIT] advance_mission_three_stage failed:',
        rpcError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_STAGE_SUBMIT_FAILED',
        targetType: 'mission',
        targetId: '3',
        description: `Unable to advance Mission 03 ${fromStage} stage.`,
        error: rpcError,
        context: { stage: fromStage },
      });

      return NextResponse.json(
        { message: 'Unable to save your decision.' },
        { status: 500 }
      );
    }

    const saved =
      (progress as Record<string, MissionThreeStageResult> | null)?.[
        fromStage
      ] ?? outcome;

    return NextResponse.json(
      {
        ok: true,
        outcome: saved.outcome,
        points: saved.points,
        nextStage: toStage,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[MISSION 03 SUBMIT]', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_STAGE_SUBMIT_FAILED',
      targetType: 'mission',
      targetId: '3',
      description: `Unexpected error submitting Mission 03 ${fromStage} stage.`,
      error,
      context: { stage: fromStage },
    });

    return NextResponse.json(
      { message: 'Unable to save your decision.' },
      { status: 500 }
    );
  }
}
