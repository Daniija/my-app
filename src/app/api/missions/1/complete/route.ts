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

    const { data: profile } =
      await supabase
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

    const { data: reviews } =
      await supabase
        .from('mission_evidence_reviews')
        .select(`
          evidence_id,
          classification
        `)
        .eq('player_id', user.id)
        .eq('mission_id', 1);

    const { data: theory } =
      await supabase
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

    const { data: containment } =
      await supabase
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
          message:
            'Mission stages are incomplete.',
        },
        { status: 400 }
      );
    }

    // ==================================
    // VALIDATE PHISHING EMAIL ANALYSIS
    // ==================================

    const allowedPhishingParts = [
      'sender_domain',
      'external_warning',
      'unexpected_attachment',
      'unusual_time',
      'urgent_language',
      'verify_button',
      'fake_url',
    ];

    const submittedSequence =
      theory.attack_sequence ?? [];

    const validSequence =
      submittedSequence.length >= 4 &&
      submittedSequence.length <=
        allowedPhishingParts.length &&
      new Set(submittedSequence).size ===
        submittedSequence.length &&
      submittedSequence.every(
        (part: string) =>
          allowedPhishingParts.includes(part)
      );

    if (!validSequence) {
      return NextResponse.json(
        {
          message:
            'The phishing-email analysis is invalid.',
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

      'E-02': [
        'Suspicious',
        'Relevant',
      ],

      // MFA is now treated as a legitimate
      // authentication control in this scenario.
      'E-03': ['Cleared'],

      'E-04': [
        'Suspicious',
        'Relevant',
      ],

      'E-05': ['Cleared'],

      'E-06': ['Cleared'],

      'E-07': [
        'Suspicious',
        'Relevant',
      ],

      'E-08': ['Cleared'],

      'E-09': [
        'Suspicious',
        'Relevant',
      ],

      // Current Evidence Room stores the
      // player-facing Suspicious choice as Relevant
      // for backwards compatibility.
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

    const evidenceScore =
      Math.round(
        (correctReviewCount / 10) *
          500
      );

    // ----------------------------------
    // THEORY SCORE - 600
    // ----------------------------------

    let theoryScore = 0;

    // Primary attack method - 150
    if (
      theory.attack_method ===
      'Phishing'
    ) {
      theoryScore += 150;
    }

    // Initial compromise - 150
    if (
      theory.initial_compromise ===
      'The fake Project Horizon document link'
    ) {
      theoryScore += 150;
    }

    // Strongest evidence - 150
    //
    // E-03 is now Cleared, so it is no
    // longer one of the strongest compromise
    // indicators.
    const strongestCorrect =
      ['E-02', 'E-04', 'E-07'].filter(
        (id) =>
          submittedEvidence.includes(
            id
          )
      ).length;

    theoryScore +=
      strongestCorrect * 50;

    // ----------------------------------
    // PHISHING EMAIL ANALYSIS - 150
    // ----------------------------------

    const expectedPhishingParts = [
      'sender_domain',
      'external_warning',
      'unexpected_attachment',
      'unusual_time',
      'urgent_language',
      'verify_button',
      'fake_url',
    ];

    const correctPositions =
      expectedPhishingParts.filter(
        (part) =>
          submittedSequence.includes(part)
      ).length;

    const sequenceScore =
      Math.round(
        (correctPositions /
          expectedPhishingParts.length) *
          150
      );

    theoryScore += sequenceScore;

    // Safety cap
    theoryScore = Math.min(
      theoryScore,
      600
    );

    // ----------------------------------
    // CONTAINMENT SCORE - 350
    // ----------------------------------

    const correctContainment = [
      'maya_report_it',
      'maya_change_password',
      'maya_sign_out_sessions',
      'maya_preserve_email',
    ];

    const harmfulContainment = [
      'maya_delete_and_hide',
      'maya_wait',
      'maya_approve_mfa',
      'maya_reply_sender',
    ];

    const submittedActions =
      containment.actions ?? [];

    let containmentScore = 0;

    for (
      const action of submittedActions
    ) {
      if (
        correctContainment.includes(
          action
        )
      ) {
        containmentScore += 90;
      }

      if (
        harmfulContainment.includes(
          action
        )
      ) {
        containmentScore -= 70;
      }
    }

    // Bonus for choosing all four correct
    // actions with no harmful actions.
    const hasAllCorrect =
      correctContainment.every(
        (action) =>
          submittedActions.includes(
            action
          )
      );

    const selectedHarmful =
      submittedActions.some(
        (action: string) =>
          harmfulContainment.includes(
            action
          )
      );

    if (
      hasAllCorrect &&
      !selectedHarmful
    ) {
      containmentScore += 20;
    }

    containmentScore = Math.max(
      0,
      Math.min(
        containmentScore,
        350
      )
    );

    // ----------------------------------
    // INTEL BONUS - MAX 50
    // ----------------------------------

    /*
     * Keep this at zero until your
     * /intelligence page is connected
     * to Supabase.
     *
     * The optional Investigator's Conclusion
     * is NOT scored here, so the official
     * Mission 01 maximum remains 1,500.
     */
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

    const admin =
      createAdminClient();

    const {
      error: reportError,
    } = await admin
      .from('mission_breach_reports')
      .upsert(
        {
          player_id: user.id,
          mission_id: 1,

          evidence_score:
            evidenceScore,

          theory_score:
            theoryScore,

          containment_score:
            containmentScore,

          bonus_score:
            bonusScore,

          total_score:
            totalScore,

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
            'The report was saved, but the mission status could not be updated.',
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
        evidence:
          evidenceScore,

        theory:
          theoryScore,

        // Keep response field name for
        // backwards compatibility with any
        // existing report UI.
        sequence:
          sequenceScore,

        containment:
          containmentScore,

        bonus:
          bonusScore,

        total:
          totalScore,

        maximum: 1500,
      },

      investigation: {
        correctEvidenceReviews:
          correctReviewCount,

        // Existing field name retained.
        // It now represents the number of
        // correctly identified phishing parts.
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
