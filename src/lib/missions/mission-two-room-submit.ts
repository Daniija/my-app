import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

import { createAdminClient } from '@/lib/supabase/admin';

import { randomUUID } from 'crypto';

import { getMissionTwoRoom } from '@/lib/missions/mission-two-rooms';

import { validateMissionTwoRoomFive } from '@/lib/missions/mission-two-room-five';

import {
  getMissionTwoFragment,
  getMissionTwoPreviewFragment,
  MISSION_TWO_FINAL_CODE,
} from '@/lib/missions/mission-two-fragments';

// ==================================

// MULTI-SELECT ANSWERS

// ==================================

const multiAnswers: Record<number, string[]> = {
  // ROOM 02 — USERNAME TRAIL

  2: ['travel-profile', 'pet-profile', 'recipe-profile'],

  // ROOM 06 — SEARCH TRAIL

  6: [
    'staff-directory',

    'project-post',

    'email-format',

    'maya-project-post',

    'org-chart',
  ],
};

// ==================================

// SINGLE-SELECT ANSWERS

// ==================================

const singleAnswers: Record<number, string> = {
  // ROOM 03 — PASSWORD VAULT

  3: 'random',

  // ROOM 04 — WI-FI TRAP

  4: 'hotspot-vpn',

  // ROOM 07 — THE IMPOSTOR

  7: 'official-channel',
};

// ==================================

// ROOM 08 — ATTACK SEQUENCE

// ==================================

const sequenceAnswer: string[] = [
  'social',

  'work',

  'username',

  'personal',

  'profile',

  'phish',
];

// ==================================

// ROOM 09 — DIGITAL CLEANUP

// ==================================

const matchingAnswer: Record<string, string> = {
  public: 'remove',

  old: 'delete',

  photo: 'review-photo',

  holiday: 'restrict',

  username: 'separate',
};

// ==================================

// HELPER — COMPARE MULTI-SELECT

// ==================================

function sameSet(
  left: string[],

  right: string[],
) {
  const a = [...new Set(left)].sort();

  const b = [...new Set(right)].sort();

  return (
    a.length === b.length &&
    a.every(
      (
        value: string,

        index: number,
      ) => value === b[index],
    )
  );
}

// ==================================

// VALIDATE STANDARD ROOM ANSWER

// ==================================

function validateRoom(
  roomNumber: number,

  body: any,
) {
  const selectedIds = Array.isArray(body?.selectedIds)
    ? body.selectedIds.filter(
        (value: unknown): value is string => typeof value === 'string',
      )
    : [];

  // ----------------------------------

  // MULTI-SELECT

  // ----------------------------------

  if (multiAnswers[roomNumber]) {
    return sameSet(
      selectedIds,

      multiAnswers[roomNumber],
    );
  }

  // ----------------------------------

  // SINGLE-SELECT

  // ----------------------------------

  if (singleAnswers[roomNumber]) {
    return (
      selectedIds.length === 1 && selectedIds[0] === singleAnswers[roomNumber]
    );
  }

  // ----------------------------------

  // ROOM 08 — SEQUENCE

  // ----------------------------------

  if (roomNumber === 8) {
    if (!Array.isArray(body?.sequence)) {
      return false;
    }

    const sequence = body.sequence.filter(
      (value: unknown): value is string => typeof value === 'string',
    ) as string[];

    return (
      sequence.length === sequenceAnswer.length &&
      sequence.every(
        (
          value: string,

          index: number,
        ) => value === sequenceAnswer[index],
      )
    );
  }

  // ----------------------------------

  // ROOM 09 — MATCHING

  // ----------------------------------

  if (roomNumber === 9) {
    const matches = body?.matches;

    if (!matches || typeof matches !== 'object' || Array.isArray(matches)) {
      return false;
    }

    return Object.entries(matchingAnswer).every(
      ([key, value]) => matches[key] === value,
    );
  }

  // ----------------------------------

  // ROOM 10 — FINAL CODE

  // ----------------------------------

  if (roomNumber === 10) {
    return (
      String(body?.finalCode ?? '')
        .trim()

        .toUpperCase() === MISSION_TWO_FINAL_CODE
    );
  }

  return false;
}

// ==================================

// INCORRECT ANSWER MESSAGES

// ==================================

function incorrectMessage(roomNumber: number) {
  const messages: Record<number, string> = {
    2: 'Not quite. A matching username alone is not enough. Compare the location, travel dates, birthday information, pet details and other repeated clues to determine which profiles most likely belong to the same Maya.',

    3: 'Not quite. Some passwords look complex but are still predictable when they contain information the attacker already knows about Maya.',

    4: 'Not quite. Consider both the trustworthiness of the connection and how the confidential traffic will be protected.',

    5: 'FORENSIC REPORT INCOMPLETE. Some extracted values do not match the evidence. Correct the fields marked CHECK AGAIN and resubmit the report.',

    6: 'Not quite. Select only the evidence that directly helps the attacker impersonate Maya’s supervisor in a Project Horizon message. Some information is personal but irrelevant to that specific attack.',

    7: 'Not quite. Do not keep the conversation going with the suspicious sender. Verify independently through the official company channel.',

    8: 'Sequence incorrect. Think from discovery, to connection, to profiling, to the final phishing message.',

    9: 'Some cleanup actions are mismatched. Match each exposure with the action that directly reduces that risk.',

    10: 'ACCESS DENIED. You have all eight fragments. Unscramble them to discover the final escape code.',
  };

  return messages[roomNumber] ?? 'Not quite. Review the room and try again.';
}

// ==================================
// FINALIZE MISSION 02 SCORE
// ==================================

async function finalizeMissionTwoScore({
  playerId,
  playerAlias,
  attemptId,
}: {
  playerId: string;
  playerAlias: string | null;
  attemptId: string;
}) {
  const admin = createAdminClient();

  const now = new Date().toISOString();

  const { data: mission, error: missionError } = await admin
    .from('missions')
    .select('max_score')
    .eq('id', 2)
    .single();

  if (missionError) {
    throw new Error(
      `Unable to load Mission 02 score configuration: ${missionError.message}`,
    );
  }

  const missionTwoScore = Number(mission?.max_score ?? 1500);

  if (!Number.isFinite(missionTwoScore) || missionTwoScore <= 0) {
    throw new Error('Mission 02 has an invalid max_score.');
  }

  const { data: existingScore, error: existingScoreError } = await admin
    .from('mission_scores')
    .select('id')
    .eq('player_id', playerId)
    .eq('mission_id', 2)
    .maybeSingle();

  if (existingScoreError) {
    throw new Error(
      `Unable to check the existing Mission 02 score: ${existingScoreError.message}`,
    );
  }

  const scorePayload = {
    attempt_id: attemptId,

    player_id: playerId,

    mission_id: 2,

    breakdown: {
      mission: 'The Digital Footprint',
      rooms_cleared: 10,
      final_lock: 'cleared',
      scoring_source: 'mission_02_completion',
    },

    base_score: missionTwoScore,

    bonus_score: 0,

    total_score: missionTwoScore,

    accuracy_points: missionTwoScore,

    updated_at: now,
  };

  if (existingScore) {
    const { error: scoreUpdateError } = await admin
      .from('mission_scores')
      .update(scorePayload)
      .eq('id', existingScore.id);

    if (scoreUpdateError) {
      throw new Error(
        `Unable to update the Mission 02 score: ${scoreUpdateError.message}`,
      );
    }
  } else {
    const { error: scoreInsertError } = await admin
      .from('mission_scores')
      .insert({
        id: randomUUID(),

        ...scorePayload,

        created_at: now,
      });

    if (scoreInsertError) {
      throw new Error(
        `Unable to save the Mission 02 score: ${scoreInsertError.message}`,
      );
    }
  }

  const { data: officialScores, error: officialScoresError } = await admin
    .from('mission_scores')
    .select(
      `
        mission_id,
        total_score
      `,
    )
    .eq('player_id', playerId);

  if (officialScoresError) {
    throw new Error(
      `Unable to load cumulative scores: ${officialScoresError.message}`,
    );
  }

  const { data: currentLeaderboard, error: leaderboardLookupError } =
    await admin
      .from('leaderboard_entries')
      .select(
        `
        player_id,
        alias,
        mission_1_score,
        mission_2_score,
        mission_3_score,
        mission_4_score
      `,
      )
      .eq('player_id', playerId)
      .maybeSingle();

  if (leaderboardLookupError) {
    throw new Error(
      `Unable to load the leaderboard entry: ${leaderboardLookupError.message}`,
    );
  }

  const scoreMap = new Map<number, number>(
    (officialScores ?? []).map((score) => [
      Number(score.mission_id),
      Number(score.total_score ?? 0),
    ]),
  );

  const mission1Score =
    scoreMap.get(1) ?? Number(currentLeaderboard?.mission_1_score ?? 0);

  const mission2Score = scoreMap.get(2) ?? missionTwoScore;

  const mission3Score =
    scoreMap.get(3) ?? Number(currentLeaderboard?.mission_3_score ?? 0);

  const mission4Score =
    scoreMap.get(4) ?? Number(currentLeaderboard?.mission_4_score ?? 0);

  const totalScore =
    mission1Score + mission2Score + mission3Score + mission4Score;

  const completedCount = [
    mission1Score,
    mission2Score,
    mission3Score,
    mission4Score,
  ].filter((score) => score > 0).length;

  const leaderboardPayload = {
    alias: playerAlias?.trim() || currentLeaderboard?.alias || 'Agent',

    mission_1_score: mission1Score,

    mission_2_score: mission2Score,

    mission_3_score: mission3Score,

    mission_4_score: mission4Score,

    total_score: totalScore,

    completed_count: completedCount,

    updated_at: now,
  };

  if (currentLeaderboard) {
    const { error: leaderboardUpdateError } = await admin
      .from('leaderboard_entries')
      .update(leaderboardPayload)
      .eq('player_id', playerId);

    if (leaderboardUpdateError) {
      throw new Error(
        `Unable to update the leaderboard: ${leaderboardUpdateError.message}`,
      );
    }
  } else {
    const { error: leaderboardInsertError } = await admin
      .from('leaderboard_entries')
      .insert({
        player_id: playerId,

        ...leaderboardPayload,
      });

    if (leaderboardInsertError) {
      throw new Error(
        `Unable to create the leaderboard entry: ${leaderboardInsertError.message}`,
      );
    }
  }

  return {
    missionTwoScore,
    totalScore,
    completedCount,
  };
}

// ==================================
// SUBMIT MISSION TWO ROOM
// ==================================

export async function submitMissionTwoRoom(
  request: Request,

  roomNumber: number,
) {
  try {
    // ----------------------------------

    // LOAD ROOM CONFIG

    // ----------------------------------

    const config = getMissionTwoRoom(roomNumber);

    if (!config || roomNumber < 2 || roomNumber > 10) {
      return NextResponse.json(
        {
          message: 'Unknown Mission 02 room.',
        },

        {
          status: 404,
        },
      );
    }

    // ----------------------------------

    // AUTHENTICATION

    // ----------------------------------

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          message: 'You must be signed in.',
        },

        {
          status: 401,
        },
      );
    }

    // ----------------------------------

    // READ SUBMISSION

    // ----------------------------------

    const body = await request.json();

    const previewMode = body?.previewMode === true;

    // ----------------------------------

    // LOAD PROFILE

    // ----------------------------------

    const { data: profile } = await supabase

      .from('profiles')

      .select(
        `
          id,
          alias,
          role,
          is_active,
          onboarding_complete
        `,
      )

      .eq(
        'id',

        user.id,
      )

      .single();

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        {
          message: 'Unable to verify your account.',
        },

        {
          status: 403,
        },
      );
    }

    // ==================================

    // VALIDATE ANSWER

    // ==================================

    const roomFiveValidation =
      roomNumber === 5 ? validateMissionTwoRoomFive(body?.worksheet) : null;

    const correct =
      roomNumber === 5
        ? roomFiveValidation?.correct === true
        : validateRoom(
            roomNumber,

            body,
          );

    // ==================================

    // DETERMINE RANDOMIZED FRAGMENT

    //

    // ROOMS 02–08 USE THIS HANDLER.

    // ROOM 01 HAS ITS OWN HANDLER.

    //

    // PLAYER:

    // deterministic fragment based on

    // Supabase user ID.

    //

    // ADMIN:

    // fixed preview fragment.

    // ==================================

    const awardedFragment =
      correct && roomNumber >= 2 && roomNumber <= 8
        ? previewMode
          ? getMissionTwoPreviewFragment(roomNumber)
          : getMissionTwoFragment(
              user.id,

              roomNumber,
            )
        : null;

    // ==================================

    // ADMIN PREVIEW MODE

    //

    // NO PLAYER PROGRESS IS WRITTEN.

    // NO SCORE IS WRITTEN.

    // NO LEADERBOARD DATA IS WRITTEN.

    // ==================================

    if (previewMode) {
      if (profile.role !== 'admin') {
        return NextResponse.json(
          {
            message: 'Admin preview is not available for this account.',
          },

          {
            status: 403,
          },
        );
      }

      return NextResponse.json({
        ok: true,

        preview: true,

        correct,

        score: correct ? config.score : 0,

        clue: awardedFragment,

        ...(roomFiveValidation
          ? {
              verifiedCount: roomFiveValidation.verifiedCount,

              totalFields: roomFiveValidation.totalFields,

              fieldResults: roomFiveValidation.fieldResults,
            }
          : {}),

        message: correct
          ? roomNumber === 10
            ? 'ACCESS GRANTED. Final escape code accepted.'
            : roomNumber === 5
              ? 'FORENSIC REPORT VERIFIED. All twelve metadata fields have been confirmed.'
              : roomNumber === 8
                ? 'Attack reconstructed. Room cleared and final fragment recovered.'
                : 'Correct. Room cleared.'
          : incorrectMessage(roomNumber),
      });
    }

    // ==================================

    // LIVE PLAYER MODE

    // ==================================

    // ----------------------------------

    // ADMINS CANNOT PLAY LIVE

    // ----------------------------------

    if (profile.role === 'admin') {
      return NextResponse.json(
        {
          message: 'Use admin preview to test Mission 02.',
        },

        {
          status: 403,
        },
      );
    }

    // ----------------------------------

    // ONBOARDING CHECK

    // ----------------------------------

    if (!profile.onboarding_complete) {
      return NextResponse.json(
        {
          message: 'Complete onboarding before playing Mission 02.',
        },

        {
          status: 403,
        },
      );
    }

    // ----------------------------------

    // LOAD ACTIVE MISSION ATTEMPT

    // ----------------------------------

    const { data: attempt } = await supabase

      .from('mission_attempts')

      .select(
        `

          id,

          status,

          current_stage

        `,
      )

      .eq(
        'player_id',

        user.id,
      )

      .eq(
        'mission_id',

        2,
      )

      .maybeSingle();

    if (!attempt) {
      return NextResponse.json(
        {
          message: 'Mission 02 attempt could not be loaded.',
        },

        {
          status: 400,
        },
      );
    }

    // ----------------------------------

    // ATTEMPT MUST BE ACTIVE

    // ----------------------------------

    if (attempt.status !== 'active') {
      return NextResponse.json(
        {
          message: 'Mission 02 is not active.',
        },

        {
          status: 409,
        },
      );
    }

    // ----------------------------------

    // PLAYER MUST BE IN THIS ROOM

    // ----------------------------------

    const expectedStage = `room-${roomNumber}`;

    if (attempt.current_stage !== expectedStage) {
      return NextResponse.json(
        {
          message: 'This is not your current mission room.',
        },

        {
          status: 409,
        },
      );
    }

    // ----------------------------------

    // INCORRECT ANSWER

    // ----------------------------------

    if (!correct) {
      return NextResponse.json({
        ok: true,

        correct: false,

        score: 0,

        clue: null,

        ...(roomFiveValidation
          ? {
              verifiedCount: roomFiveValidation.verifiedCount,

              totalFields: roomFiveValidation.totalFields,

              fieldResults: roomFiveValidation.fieldResults,
            }
          : {}),

        message: incorrectMessage(roomNumber),
      });
    }

    // ----------------------------------

    // DETERMINE NEXT STAGE

    // ----------------------------------

    const nextStage = roomNumber === 10 ? 'report' : `room-${roomNumber + 1}`;

    // ==================================
    // ROOM 10 — SAVE OFFICIAL SCORE
    // ==================================

    let missionTwoResult: {
      missionTwoScore: number;
      totalScore: number;
      completedCount: number;
    } | null = null;

    if (roomNumber === 10) {
      try {
        missionTwoResult = await finalizeMissionTwoScore({
          playerId: user.id,

          playerAlias: profile.alias ?? null,

          attemptId: attempt.id,
        });
      } catch (scoringError) {
        console.error(
          '[MISSION 02] Unable to save official score:',
          scoringError,
        );

        return NextResponse.json(
          {
            message:
              'Your final code was correct, but the official Mission 02 score could not be saved. Please try again.',
          },
          {
            status: 500,
          },
        );
      }
    }

    // ----------------------------------

    // SAVE PLAYER PROGRESS

    // ----------------------------------

    const {
      data: updatedAttempt,

      error: updateError,
    } = await supabase

      .from('mission_attempts')

      .update({
        current_stage: nextStage,

        ...(roomNumber === 10
          ? {
              status: 'submitted',

              completed_at: new Date().toISOString(),
            }
          : {}),
      })

      .eq(
        'id',

        attempt.id,
      )

      .eq(
        'player_id',

        user.id,
      )

      .eq(
        'mission_id',

        2,
      )

      .eq(
        'current_stage',

        expectedStage,
      )

      .select(
        `

          id,

          status,

          current_stage

        `,
      )

      .single();

    if (updateError || !updatedAttempt) {
      console.error(
        `[MISSION 02 ROOM ${roomNumber}] Unable to advance stage:`,

        updateError,
      );

      return NextResponse.json(
        {
          message:
            'Your answer was correct, but your progress could not be saved. Please try again.',
        },

        {
          status: 500,
        },
      );
    }

    // ----------------------------------

    // SUCCESS RESPONSE

    // ----------------------------------

    return NextResponse.json({
      ok: true,

      correct: true,

      score: config.score,

      /*

        IMPORTANT:



        Static config.clue values are no

        longer used for Rooms 02–08.



        Each player receives the fragment

        generated from their user ID.

      */

      clue: awardedFragment,

      ...(roomFiveValidation
        ? {
            verifiedCount: roomFiveValidation.verifiedCount,

            totalFields: roomFiveValidation.totalFields,

            fieldResults: roomFiveValidation.fieldResults,
          }
        : {}),

      message:
        roomNumber === 10
          ? 'ACCESS GRANTED. Final escape code accepted.'
          : roomNumber === 5
            ? 'FORENSIC REPORT VERIFIED. All twelve metadata fields have been confirmed.'
            : roomNumber === 8
              ? 'Attack reconstructed. Room cleared and final fragment recovered.'
              : 'Correct. Room cleared.',

      nextStage: updatedAttempt.current_stage,

      ...(missionTwoResult
        ? {
            missionTotalScore: missionTwoResult.missionTwoScore,

            cumulativeScore: missionTwoResult.totalScore,

            completedMissions: missionTwoResult.completedCount,
          }
        : {}),
    });
  } catch (error) {
    console.error(
      '[MISSION 02 ROOM SUBMIT] Failed:',

      error,
    );

    return NextResponse.json(
      {
        message: 'Unable to submit this room.',
      },

      {
        status: 500,
      },
    );
  }
}
