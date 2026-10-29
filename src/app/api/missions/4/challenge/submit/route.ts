import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';
import { getMissionFourChallenge } from '@/lib/missions/mission-four-data';
import { scoreChallenge, type MissionFourAnswer } from '@/lib/missions/mission-four-challenge-engine';
import type { MissionFourStageName } from '@/lib/missions/mission-four-scoring';

const VALID_STAGES: MissionFourStageName[] = ['triage', 'trace', 'contain', 'disarm'];

// Single shared route for all 8 challenge types -- deliberately not
// one file per stage like Mission 03's email/verification/final,
// because every Mission 4 challenge shares one generic
// {type, answer} -> {outcome, points, timeDeltaSeconds} shape by
// design (the whole point of a reusable engine). Scores
// server-side via scoreChallenge() (the same function admin-preview
// uses locally) and saves via save_mission_four_challenge_progress()
// (migration 020), which applies the idempotency guard and the time
// delta in the same atomic statement.
export async function POST(request: Request) {
  let authedUserId: string | null = null;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { code: 'AUTH_REQUIRED', message: 'You must be signed in.' },
        { status: 401 }
      );
    }

    authedUserId = user.id;

    const body = await request.json().catch(() => ({}));

    const stage = typeof body?.stage === 'string' ? body.stage : null;
    const challengeKey = typeof body?.challengeKey === 'string' ? body.challengeKey : null;
    const answer = body?.answer as MissionFourAnswer | undefined;

    if (
      !stage ||
      !VALID_STAGES.includes(stage as MissionFourStageName) ||
      !challengeKey ||
      !answer
    ) {
      return NextResponse.json(
        { message: 'stage, challengeKey, and answer are required.' },
        { status: 400 }
      );
    }

    const challenge = getMissionFourChallenge(stage as MissionFourStageName, challengeKey);

    if (!challenge) {
      return NextResponse.json({ message: 'Unknown challenge.' }, { status: 400 });
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('mission_attempts')
      .select('id, status, current_stage')
      .eq('player_id', user.id)
      .eq('mission_id', 4)
      .maybeSingle();

    if (attemptError || !attempt) {
      console.error('[MISSION 04 CHALLENGE] Attempt lookup failed:', attemptError);

      return NextResponse.json({ message: 'Mission attempt not found.' }, { status: 404 });
    }

    if (attempt.status !== 'active' || attempt.current_stage !== stage) {
      return NextResponse.json(
        { message: 'This challenge is not currently active for your attempt.' },
        { status: 409 }
      );
    }

    const scored = scoreChallenge(challenge, answer);

    const challengeResult = {
      answer,
      outcome: scored.outcome,
      points: scored.points,
      timeDeltaSeconds: scored.timeDeltaSeconds,
    };

    const { data: progress, error: rpcError } = await supabase.rpc(
      'save_mission_four_challenge_progress',
      {
        p_attempt_id: attempt.id,
        p_stage: stage,
        p_challenge_key: challengeKey,
        p_challenge_result: challengeResult,
        p_time_delta_seconds: scored.timeDeltaSeconds,
      }
    );

    if (rpcError) {
      console.error('[MISSION 04 CHALLENGE] save failed:', rpcError);

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_CHALLENGE_SAVE_FAILED',
        targetType: 'mission',
        targetId: '4',
        description: `Unable to save Mission 04 challenge ${challengeKey}.`,
        error: rpcError,
        context: { stage, challengeKey },
      });

      return NextResponse.json({ message: 'Unable to save your answer.' }, { status: 500 });
    }

    const stageKey = `${stage}_challenges`;
    const savedRounds = (progress as Record<string, Record<string, typeof challengeResult>> | null)?.[
      stageKey
    ];

    const saved = savedRounds?.[challengeKey];

    // Don't silently fall back to the locally computed result if the
    // RPC didn't actually confirm the save -- this exact fallback
    // pattern is what made a real persistence bug invisible to every
    // player in Mission 03 (fixed in migration 019). Treat an
    // unconfirmed save as a real error instead.
    if (!saved) {
      console.error(
        '[MISSION 04 CHALLENGE] RPC succeeded but did not confirm the save for',
        challengeKey
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'MISSION_CHALLENGE_SAVE_FAILED',
        targetType: 'mission',
        targetId: '4',
        description: `Mission 04 challenge ${challengeKey} was not confirmed as saved.`,
        error: new Error('RPC returned no matching saved challenge data.'),
        context: { stage, challengeKey, progress },
      });

      return NextResponse.json({ message: 'Unable to save your answer.' }, { status: 500 });
    }

    const report = (progress as Record<string, unknown> | null)?.report as
      | { outcome?: string }
      | undefined;

    return NextResponse.json(
      {
        ok: true,
        outcome: saved.outcome,
        points: saved.points,
        timeDeltaSeconds: saved.timeDeltaSeconds,
        failed: report?.outcome === 'failed',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[MISSION 04 CHALLENGE]', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_CHALLENGE_SAVE_FAILED',
      targetType: 'mission',
      targetId: '4',
      description: 'Unexpected error submitting a Mission 04 challenge.',
      error,
    });

    return NextResponse.json({ message: 'Unable to save your answer.' }, { status: 500 });
  }
}
