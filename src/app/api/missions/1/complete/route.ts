import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          message: 'Authentication required.',
        },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id,role,is_active,alias')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      !profile.is_active ||
      profile.role === 'admin'
    ) {
      return NextResponse.json(
        {
          message: 'Player account required.',
        },
        { status: 403 }
      );
    }

    // ----------------------------------
    // LOAD MISSION DATA
    // ----------------------------------

    const { data: reviews } = await supabase
      .from('mission_evidence_reviews')
      .select(`
        evidence_id,
        classification
      `)
      .eq('player_id', user.id)
      .eq('mission_id', 1);

    const { data: theory } = await supabase
      .from('mission_theories')
      .select(`
        attack_method,
        initial_compromise,
        strongest_evidence,
        attack_sequence
      `)
      .eq('player_id', user.id)
      .eq('mission_id', 1)
      .single();

    const { data: containment } = await supabase
      .from('mission_containment')
      .select(`
        actions
      `)
      .eq('player_id', user.id)
      .eq('mission_id', 1)
      .single();

    if (
      !theory ||
      !containment ||
      (reviews ?? []).length < 7
    ) {
      return NextResponse.json(
        {
          message: 'Mission stages are incomplete.',
        },
        { status: 400 }
      );
    }

    // ==================================
    // VALIDATE ATTACK SEQUENCE
    // ==================================

    const allowedSequenceEvents = [
      'phishing_email',
      'fake_login',
      'credentials_stolen',
      'mfa_approved',
      'attacker_login',
      'restricted_access',
      'external_share',
    ];

    const submittedSequence =
      theory.attack_sequence ?? [];

    const validSequence =
      submittedSequence.length === 7 &&
      new Set(submittedSequence).size === 7 &&
      submittedSequence.every(
        (event: string) =>
          allowedSequenceEvents.includes(event)
      );

    if (!validSequence) {
      return NextResponse.json(
        {
          message:
            'The submitted attack sequence is invalid.',
        },
        { status: 400 }
      );
    }

    // ==================================
    // VALIDATE STRONGEST EVIDENCE
    // ==================================

    const allowedEvidenceIds = [
      'E-01',
      'E-02',
      'E-03',
      'E-04',
      'E-05',
      'E-06',
      'E-07',
      'E-08',
      'E-09',
      'E-10',
    ];

    const submittedEvidence =
      theory.strongest_evidence ?? [];

    const validEvidence =
      submittedEvidence.length === 3 &&
      new Set(submittedEvidence).size === 3 &&
      submittedEvidence.every(
        (id: string) =>
          allowedEvidenceIds.includes(id)
      );

    if (!validEvidence) {
      return NextResponse.json(
        {
          message:
            'The strongest-evidence submission is invalid.',
        },
        { status: 400 }
      );
    }

    // ----------------------------------
    // EVIDENCE SCORE - 500
    // ----------------------------------

    const correctEvidence: Record<
      string,
      string[]
    > = {
      'E-01': ['Cleared'],
      'E-02': ['Suspicious', 'Relevant'],
      'E-03': ['Suspicious', 'Relevant'],
      'E-04': ['Suspicious', 'Relevant'],
      'E-05': ['Cleared'],
      'E-06': ['Cleared'],
      'E-07': ['Suspicious', 'Relevant'],
      'E-08': ['Cleared'],
      'E-09': ['Suspicious', 'Relevant'],
      'E-10': ['Relevant'],
    };

    let correctReviewCount = 0;

    for (const review of reviews ?? []) {
      if (
        correctEvidence[
          review.evidence_id
        ]?.includes(
          review.classification
        )
      ) {
        correctReviewCount++;
      }
    }

    const evidenceScore = Math.round(
      (correctReviewCount / 10) * 500
    );

    // ----------------------------------
    // THEORY SCORE - 600
    // ----------------------------------

    let theoryScore = 0;

    if (theory.attack_method === 'Phishing') {
      theoryScore += 150;
    }

    if (
      theory.initial_compromise ===
      'The fake Project Horizon document link'
    ) {
      theoryScore += 150;
    }

    const strongestCorrect = [
      'E-02',
      'E-03',
      'E-04',
    ].filter((id) =>
      submittedEvidence.includes(id)
    ).length;

    theoryScore += strongestCorrect * 50;

    // ----------------------------------
    // ATTACK SEQUENCE SCORE - 150
    // ----------------------------------

    const expectedSequence = [
      'phishing_email',
      'fake_login',
      'credentials_stolen',
      'mfa_approved',
      'attacker_login',
      'restricted_access',
      'external_share',
    ];

    let correctPositions = 0;

    expectedSequence.forEach(
      (expectedEvent, index) => {
        if (
          submittedSequence[index] ===
          expectedEvent
        ) {
          correctPositions++;
        }
      }
    );

    const sequenceScore = Math.round(
      (correctPositions /
        expectedSequence.length) *
        150
    );

    theoryScore += sequenceScore;
    theoryScore = Math.min(theoryScore, 600);

    // ----------------------------------
    // CONTAINMENT SCORE - 350
    // ----------------------------------

    const correctContainment = [
      'revoke_sessions',
      'reset_credentials',
      'preserve_logs',
      'disable_account',
    ];

    const harmfulContainment = [
      'delete_logs',
      'ignore',
      'shutdown_network',
    ];

    const submittedActions: string[] =
      Array.isArray(containment.actions)
        ? containment.actions
        : [];

    let containmentScore = 0;

    for (const action of submittedActions) {
      if (
        correctContainment.includes(action)
      ) {
        containmentScore += 90;
      }

      if (
        harmfulContainment.includes(action)
      ) {
        containmentScore -= 70;
      }
    }

    const hasAllCorrect =
      correctContainment.every(
        (action: string) =>
          submittedActions.includes(action)
      );

    const selectedHarmful =
      submittedActions.some(
        (action: string) =>
          harmfulContainment.includes(action)
      );

    if (
      hasAllCorrect &&
      !selectedHarmful
    ) {
      containmentScore += 20;
    }

    containmentScore = Math.max(
      0,
      Math.min(containmentScore, 350)
    );

    // ----------------------------------
    // INTEL BONUS - MAX 50
    // ----------------------------------

    const bonusScore = 0;

    // ----------------------------------
    // TOTAL
    // ----------------------------------

    const totalScore =
      evidenceScore +
      theoryScore +
      containmentScore +
      bonusScore;

    // ----------------------------------
    // SAVE FINAL RESULT
    // ----------------------------------

    const admin = createAdminClient();

    const {
      error: reportError,
    } = await admin
      .from('mission_breach_reports')
      .upsert(
        {
          player_id: user.id,
          mission_id: 1,
          evidence_score: evidenceScore,
          theory_score: theoryScore,
          containment_score:
            containmentScore,
          bonus_score: bonusScore,
          total_score: totalScore,
          submitted_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            'player_id,mission_id',
        }
      );

    if (reportError) {
      console.error(
        '[MISSION 01] Report save failed:',
        reportError
      );

      return NextResponse.json(
        {
          message:
            'Unable to save the breach report.',
        },
        { status: 500 }
      );
    }

    // ----------------------------------
    // UPDATE LEADERBOARD
    // ----------------------------------

    const {
      data: currentLeaderboard,
      error: leaderboardReadError,
    } = await admin
      .from('leaderboard_entries')
      .select(`
        mission_1_score,
        mission_2_score,
        mission_3_score,
        mission_4_score
      `)
      .eq('player_id', user.id)
      .maybeSingle();

    if (leaderboardReadError) {
      console.error(
        '[MISSION 01] Leaderboard read failed:',
        leaderboardReadError
      );

      return NextResponse.json(
        {
          message:
            'The breach report was saved, but the leaderboard could not be read.',
        },
        { status: 500 }
      );
    }

    const mission2Score =
      currentLeaderboard?.mission_2_score ??
      0;

    const mission3Score =
      currentLeaderboard?.mission_3_score ??
      0;

    const mission4Score =
      currentLeaderboard?.mission_4_score ??
      0;

    const newTotalScore =
      totalScore +
      mission2Score +
      mission3Score +
      mission4Score;

    const completedCount = [
      totalScore,
      mission2Score,
      mission3Score,
      mission4Score,
    ].filter(
      (score) => score > 0
    ).length;

    const {
      error: leaderboardError,
    } = await admin
      .from('leaderboard_entries')
      .upsert(
        {
          player_id: user.id,
          alias:
            profile.alias ??
            'Unknown Agent',
          mission_1_score:
            totalScore,
          mission_2_score:
            mission2Score,
          mission_3_score:
            mission3Score,
          mission_4_score:
            mission4Score,
          total_score:
            newTotalScore,
          completed_count:
            completedCount,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: 'player_id',
        }
      );

    if (leaderboardError) {
      console.error(
        '[MISSION 01] Leaderboard update failed:',
        leaderboardError
      );

      return NextResponse.json(
        {
          message:
            'The breach report was saved, but the leaderboard could not be updated.',
        },
        { status: 500 }
      );
    }

    // ----------------------------------
    // COMPLETE ATTEMPT
    // ----------------------------------

    const {
      error: attemptError,
    } = await admin
      .from('mission_attempts')
      .update({
        status: 'submitted',
        current_stage: 'report',
        completed_at:
          new Date().toISOString(),
      })
      .eq('player_id', user.id)
      .eq('mission_id', 1);

    if (attemptError) {
      console.error(
        '[MISSION 01] Attempt completion failed:',
        attemptError
      );

      return NextResponse.json(
        {
          message:
            'The report and leaderboard were saved, but the mission status could not be updated.',
        },
        { status: 500 }
      );
    }

    // ----------------------------------
    // RESPONSE
    // ----------------------------------

    return NextResponse.json({
      ok: true,
      score: {
        evidence: evidenceScore,
        theory: theoryScore,
        sequence: sequenceScore,
        containment:
          containmentScore,
        bonus: bonusScore,
        total: totalScore,
        maximum: 1500,
      },
      investigation: {
        correctEvidenceReviews:
          correctReviewCount,
        correctSequencePositions:
          correctPositions,
        strongestEvidenceCorrect:
          strongestCorrect,
      },
    });
  } catch (error) {
    console.error(
      '[MISSION 01 COMPLETE]',
      error
    );

    return NextResponse.json(
      {
        message:
          'Unable to complete Mission 01.',
      },
      { status: 500 }
    );
  }
}
