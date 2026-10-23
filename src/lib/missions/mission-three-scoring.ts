// Centralized Mission 3 ("Trust No One") scoring constants.
// Every stage's submit route should import from here rather than
// hardcoding point values, so the 2,000-point budget stays auditable
// in one place.

// Raised from 2,000 to 2,950 when the single-decision "voice" stage
// was replaced with the full Executive Voice Verification section
// (originally 5 rounds + a final multi-clip challenge, see below) --
// per explicit confirmation that Mission 03 should grow rather than
// have the new section's point values scaled down.
// Lowered to 2,700 when the original "video" investigation stage
// (Stage 1, "The Emergency Video") was removed from Mission 03
// entirely.
// Lowered again to 2,300 when the CEO and IT Manager rounds were
// removed from the Executive Voice Verification section, leaving 3
// rounds (HR, Food Safety, Operations Director) -- see
// EXECUTIVE_VOICE_SECTION_MAX below, which stays self-checked against
// MISSION_THREE_STAGE_POINTS.voice regardless of how many rounds
// exist.
// Lowered to 1,750 when the "social" (Stage 4, The Doppelgänger) and
// "forensics" (Stage 5, Synthetic Media Forensics Lab) stages were
// removed from Mission 03 entirely.
// Raised to 1,950 when a 4th Executive Voice Verification round (CEO)
// was added, raising the "voice" stage from 800 to 1,000 -- see
// EXECUTIVE_VOICE_ROUNDS below. missions.max_score (migration 016)
// must be kept in sync with this constant for the dashboards that
// read it directly.
export const MISSION_THREE_MAX_SCORE = 1950;

export const MISSION_THREE_STAGE_POINTS = {
  voice: 1000,
  email: 250,
  verification: 300,
  final: 400,
} as const;

export type MissionThreeStage = keyof typeof MISSION_THREE_STAGE_POINTS;

// Sanity check the breakdown always sums to the advertised maximum.
const STAGE_POINT_SUM = Object.values(MISSION_THREE_STAGE_POINTS).reduce(
  (sum, points) => sum + points,
  0
);

if (STAGE_POINT_SUM !== MISSION_THREE_MAX_SCORE) {
  throw new Error(
    `MISSION_THREE_STAGE_POINTS sums to ${STAGE_POINT_SUM}, expected ${MISSION_THREE_MAX_SCORE}.`
  );
}

// Clamp a single stage's computed score to [0, that stage's max].
export function clampStageScore(
  stage: MissionThreeStage,
  rawScore: number
): number {
  const max = MISSION_THREE_STAGE_POINTS[stage];
  return Math.max(0, Math.min(max, Math.round(rawScore)));
}

// Clamp the final summed mission score to [0, MISSION_THREE_MAX_SCORE].
export function clampMissionScore(rawTotal: number): number {
  return Math.max(0, Math.min(MISSION_THREE_MAX_SCORE, Math.round(rawTotal)));
}

// ==================================
// STAGE DECISION SCORING
// ==================================
//
// Each decision-based stage (email, plus the Executive Voice
// Verification rounds below) rewards the
// decision that routes the situation through a verified,
// independent channel at full points, a "safe but incomplete"
// refusal at partial credit, and complying/acting on the
// unverified request at zero. Nothing here rewards "it looked
// fake" pattern-matching -- only the verification behaviour.

export type DecisionOutcome = 'correct' | 'partial' | 'incorrect';

export type DecisionOption = {
  id: string;
  points: number;
  outcome: DecisionOutcome;
};

export const EMAIL_DECISIONS: Record<string, DecisionOption> = {
  verify_independent: {
    id: 'verify_independent',
    points: Math.round(MISSION_THREE_STAGE_POINTS.email * 0.7),
    outcome: 'correct',
  },
  report_suspicious: {
    id: 'report_suspicious',
    points: Math.round(MISSION_THREE_STAGE_POINTS.email * 0.42),
    outcome: 'partial',
  },
  reply_or_click: {
    id: 'reply_or_click',
    points: 0,
    outcome: 'incorrect',
  },
};

// A tricky reasoning follow-up, same shape as the Executive Voice
// rounds' follow-up: answered alongside the trust decision, scored
// as a bonus/no-bonus on top of it. The correct answer requires
// noticing that the *displayed* link text and the *real* destination
// (revealed only by hovering, never shown up front) don't match --
// not just "the email looks suspicious."
export const EMAIL_FOLLOWUP_BONUS = 75;

export const EMAIL_FOLLOWUP = {
  question:
    'The link reads "cdu-portal.com/reset" but hovering over it reveals a different destination entirely. What does this tell you?',
  options: [
    {
      id: 'display_text_is_proof',
      label: 'The link text is "cdu-portal.com", so it must go there.',
    },
    {
      id: 'mismatch_is_the_warning',
      label:
        'The link\'s real destination can be completely different from its displayed text — the mismatch itself is the warning sign.',
    },
    {
      id: 'urgent_so_safe_to_click',
      label: "It's urgent, so it's worth clicking to check.",
    },
    {
      id: 'spf_dkim_irrelevant',
      label: 'It doesn\'t matter, since SPF and DKIM already failed.',
    },
  ],
  correctOptionId: 'mismatch_is_the_warning',
} as const;

export function computeEmailStagePoints({
  decisionOption,
  followUpCorrect,
}: {
  decisionOption: DecisionOption;
  followUpCorrect: boolean;
}): number {
  return (
    decisionOption.points + (followUpCorrect ? EMAIL_FOLLOWUP_BONUS : 0)
  );
}

// ==================================
// EXECUTIVE VOICE VERIFICATION (Stage 2, expanded)
// ==================================
//
// Replaces the old single-decision "voice" stage with several rounds
// (one intercepted voice communication each) plus a final multi-clip
// challenge. current_stage stays "voice" for the entire section --
// each round is saved individually into
// mission_progress.progress.voice_rounds (via
// save_mission_three_voice_round(), migration 011) without
// advancing current_stage, and only once every round + the final
// challenge exist is the section finalized through the existing
// advance_mission_three_stage() RPC (voice -> email), exactly like
// every other stage.
//
// Each round now has its own correct trust decision (round.correctTrustAction)
// instead of sharing one global map -- some requests in this section are
// genuinely legitimate (the right call is to trust them) and some are
// genuinely malicious (the right call is to reject them), so a single
// "investigate is always correct" map no longer fits every round.
// getExecutiveVoiceTrustDecisions() derives the full 3-tier points/outcome
// map for a given round from its correctTrustAction, keeping the same
// 150/0/-50 point scale every round has always used.

export type ExecutiveVoiceTrustAction = 'trust' | 'investigate' | 'reject';

export const EXECUTIVE_VOICE_CORRECT_TRUST_POINTS = 150;
const EXECUTIVE_VOICE_PARTIAL_TRUST_POINTS = 0;
const EXECUTIVE_VOICE_INCORRECT_TRUST_POINTS = -50;

// Derives the round's full points/outcome map from which single action is
// correct for it. The other two actions are tiered by how far they are
// from that correct action: trust and reject are opposite extremes, so
// whichever of them isn't correct lands on "incorrect", while
// "investigate" (the cautious middle ground) lands on "partial" whenever
// it isn't itself the correct answer.
export function getExecutiveVoiceTrustDecisions(
  round: Pick<ExecutiveVoiceRound, 'correctTrustAction'>
): Record<ExecutiveVoiceTrustAction, DecisionOption> {
  const correct = round.correctTrustAction;
  const other = correct === 'investigate' ? 'reject' : 'investigate';
  const opposite: ExecutiveVoiceTrustAction =
    correct === 'trust' ? 'reject' : correct === 'reject' ? 'trust' : 'trust';

  return {
    [correct]: {
      id: correct,
      points: EXECUTIVE_VOICE_CORRECT_TRUST_POINTS,
      outcome: 'correct',
    },
    [other]: {
      id: other,
      points: EXECUTIVE_VOICE_PARTIAL_TRUST_POINTS,
      outcome: 'partial',
    },
    [opposite]: {
      id: opposite,
      points: EXECUTIVE_VOICE_INCORRECT_TRUST_POINTS,
      outcome: 'incorrect',
    },
  } as Record<ExecutiveVoiceTrustAction, DecisionOption>;
}

export const EXECUTIVE_VOICE_FOLLOWUP_BONUS = 50;
export const EXECUTIVE_VOICE_HINT_PENALTY = 25;

export type ExecutiveVoiceFollowUpOption = {
  id: string;
  label: string;
};

export type ExecutiveVoiceRound = {
  id: string;
  role: string;
  senderLabel: string;
  channel: string;
  caseId: string;
  timestamp: string;
  context: string;
  audioSrc: string;
  // Purely informational (shown only in the post-section debrief,
  // never before the player answers) -- scoring never depends on
  // this. The entire point of the section is that voice similarity
  // doesn't determine trustworthiness.
  audioVariant: 'authentic' | 'synthetic';
  clues: { id: string; label: string }[];
  hiddenHint: string;
  // The single trust action that earns full points for this round --
  // see getExecutiveVoiceTrustDecisions() above.
  correctTrustAction: ExecutiveVoiceTrustAction;
  followUp: {
    question: string;
    options: ExecutiveVoiceFollowUpOption[];
    correctOptionId: string;
  };
};

export const EXECUTIVE_VOICE_ROUNDS: ExecutiveVoiceRound[] = [
  {
    id: 'hr',
    role: 'HR Manager',
    senderLabel: 'HR Manager (Unverified Thread)',
    channel: 'Internal Chat — New Thread',
    caseId: 'CDU-03-EV-02',
    timestamp: '10:30, Oct 24',
    context:
      "A message claiming to be from HR requests the full employee contact list and ID information be sent immediately for an \"urgent HR matter.\"",
    audioSrc: '/mission-3/audio/hr-authentic.mp3',
    audioVariant: 'authentic',
    clues: [
      { id: 'sensitive_data', label: 'Request involves personally identifiable employee data.' },
      {
        id: 'urgency',
        label: 'Message stresses immediate delivery with no stated deadline reason.',
      },
      {
        id: 'delivery',
        label: 'Requested delivery method is a direct file attachment, not the HR system.',
      },
      {
        id: 'unverified_thread',
        label: 'The thread was started fresh, not continued from a known HR conversation.',
      },
    ],
    hiddenHint:
      "HR's own policy requires employee data requests to go through the HR portal, never direct messages.",
    correctTrustAction: 'trust',
    followUp: {
      question: 'Which action provides the strongest identity verification?',
      options: [
        { id: 'reply_same', label: 'Reply to the same message.' },
        { id: 'ask_personal', label: 'Ask the speaker another personal question.' },
        {
          id: 'known_channel',
          label: 'Contact the executive using a known internal number or verified channel.',
        },
        { id: 'trust_familiar', label: 'Trust the voice because it sounds familiar.' },
      ],
      correctOptionId: 'known_channel',
    },
  },
  {
    id: 'food_safety',
    role: 'Food Safety Manager',
    senderLabel: 'Food Safety Manager (Site Line)',
    channel: 'Phone Call — Site Line',
    caseId: 'CDU-03-EV-03',
    timestamp: '13:05, Oct 24',
    context:
      'A caller reporting an active food-safety emergency requests the supplier inspection records and the login details for the reporting system immediately.',
    audioSrc: '/mission-3/audio/food-safety-synthetic.mp3',
    audioVariant: 'synthetic',
    clues: [
      {
        id: 'plausible_context',
        label: 'An active operational emergency makes the request feel urgent and legitimate.',
      },
      {
        id: 'credential_request',
        label: 'Login details are being requested instead of being given direct, logged access.',
      },
      {
        id: 'process_bypass',
        label: 'Normal incident escalation would involve a logged ticket, not a direct credentials request.',
      },
      {
        id: 'no_ticket',
        label: 'No incident ticket exists yet for the emergency being described.',
      },
    ],
    hiddenHint:
      'Credentials should never be shared verbally, even during a genuine emergency — access should be granted, not handed over.',
    correctTrustAction: 'trust',
    followUp: {
      question:
        "A voice recording matches the executive's voice extremely closely. What does that prove?",
      options: [
        { id: 'authentic', label: 'The message is authentic.' },
        { id: 'they_recorded', label: 'That executive recorded it.' },
        {
          id: 'resembles_unverified',
          label: 'The voice resembles the executive, but identity is still unverified.',
        },
        { id: 'safe_to_trust', label: 'The message can safely be trusted.' },
      ],
      correctOptionId: 'safe_to_trust',
    },
  },
  {
    id: 'executive_5',
    role: 'Operations Director',
    senderLabel: 'Operations Director (Direct Line)',
    channel: 'Voicemail — Direct Line',
    caseId: 'CDU-03-EV-04',
    timestamp: '17:20, Oct 24',
    context:
      "The Operations Director leaves an urgent voicemail asking for next week's shift schedule and site access list to be sent ahead of an early-morning inspection.",
    audioSrc: '/mission-3/audio/executive-5-authentic.mp3',
    audioVariant: 'authentic',
    clues: [
      {
        id: 'plausible_role',
        label: "The request itself is a normal part of the Operations Director's role.",
      },
      { id: 'urgency', label: 'Message stresses the request is needed "first thing" before an inspection.' },
      { id: 'known_line', label: "Call came through the Director's known direct line." },
      {
        id: 'no_red_flags',
        label: 'No secrecy, no unusual delivery method, and no bypassed approval are present here.',
      },
    ],
    hiddenHint:
      'Even a routine-sounding request from a known line should still be confirmed if it involves site access information.',
    correctTrustAction: 'reject',
    followUp: {
      question: 'If the request is urgent, what should happen?',
      options: [
        { id: 'skip_verification', label: 'Skip verification.' },
        { id: 'verify_faster', label: 'Verify faster through a trusted channel.' },
        { id: 'comply_first', label: 'Comply first and report later.' },
        { id: 'ask_colleague', label: 'Ask another employee if the voice sounds real.' },
      ],
      correctOptionId: 'verify_faster',
    },
  },
  {
    id: 'ceo',
    role: 'Chief Executive Officer',
    senderLabel: 'CEO (Mobile — Advance Request)',
    channel: 'Phone Call — Mobile Line',
    caseId: 'CDU-03-EV-05',
    timestamp: '08:15, Oct 25',
    context:
      "A caller sounding exactly like the CEO asks in advance for help with an upcoming call: if anyone claiming to be from \"external consultants\" reaches out, they should be given whatever they ask for -- including the CEO's schedule, attendee list, or internal contact information -- without being \"bounced around between departments.\"",
    audioSrc: '/mission-3/audio/ceo-synthetic.mp3',
    audioVariant: 'synthetic',
    clues: [],
    hiddenHint:
      'A legitimate external contact can still be verified through a known channel when they actually call -- being told in advance not to verify them, and not to redirect or delay them, is what removes your ability to check at the moment it matters.',
    correctTrustAction: 'reject',
    followUp: {
      question:
        'The "consultants" have not called yet, but you were told in advance to help them with whatever they ask and not pass them between departments. What should you do when they call?',
      options: [
        { id: 'comply_as_told', label: 'Give them whatever they ask for, since you were told to help them.' },
        {
          id: 'verify_second_channel',
          label: 'Still verify their identity through a separate, known channel before sharing anything.',
        },
        { id: 'share_schedule_only', label: 'Share the schedule and attendees, but withhold internal contact details.' },
        { id: 'redirect_to_assistant', label: 'Redirect them to someone else without verifying either.' },
      ],
      correctOptionId: 'verify_second_channel',
    },
  },
];

// Raw, signed round score. Not clamped to zero here -- a wrong trust
// decision genuinely subtracts from the voice section's running
// total; only the finalized stage total is floored at zero (see
// clampStageScore('voice', ...) at finalize time).
export function computeExecutiveVoiceRoundPoints({
  round,
  trustAction,
  followUpCorrect,
  hintUsed,
}: {
  round: Pick<ExecutiveVoiceRound, 'correctTrustAction'>;
  trustAction: ExecutiveVoiceTrustAction;
  followUpCorrect: boolean;
  hintUsed: boolean;
}): number {
  let points = getExecutiveVoiceTrustDecisions(round)[trustAction].points;

  if (followUpCorrect) {
    points += EXECUTIVE_VOICE_FOLLOWUP_BONUS;
  }

  if (hintUsed) {
    points -= EXECUTIVE_VOICE_HINT_PENALTY;
  }

  return points;
}

// ----------------------------------
// FINAL VOICE CHALLENGE
// ----------------------------------
// Several short communications presented at once, closing the
// Executive Voice Verification section. Same three-tier action
// scoring as every individual round, applied per item.

export const EXECUTIVE_VOICE_FINAL_ITEMS = [
  {
    id: 'ceo_transfer',
    role: 'CEO',
    label:
      'CEO — on a video call you recognise, calmly explaining the wire transfer was pre-approved at a board meeting you weren\'t in, and just needs releasing before the bank closes.',
  },
  {
    id: 'hr_records',
    role: 'HR',
    label:
      'HR — citing an active legal case number and asking for the employee list "before end of day" so Legal isn\'t delayed, in a thread that otherwise looks like your normal HR contact.',
  },
  {
    id: 'it_mfa',
    role: 'IT',
    label:
      'IT — referencing a real, recent password-reset ticket number correctly, then asking you to disable MFA "just for five minutes" to finish closing it out.',
  },
  {
    id: 'food_safety_creds',
    role: 'Food Safety',
    label:
      'Food Safety — a call you independently confirmed is genuinely the real manager, still asking for the reporting system credentials because they are "locked out during the emergency."',
  },
] as const;

export type ExecutiveVoiceFinalItemId =
  (typeof EXECUTIVE_VOICE_FINAL_ITEMS)[number]['id'];

export const EXECUTIVE_VOICE_FINAL_ITEM_MAX_POINTS = 50;

export type ExecutiveVoiceFinalAction =
  | 'verify_first'
  | 'escalate_only'
  | 'act_now';

export const EXECUTIVE_VOICE_FINAL_DECISIONS: Record<
  ExecutiveVoiceFinalAction,
  DecisionOption
> = {
  verify_first: {
    id: 'verify_first',
    points: EXECUTIVE_VOICE_FINAL_ITEM_MAX_POINTS,
    outcome: 'correct',
  },
  escalate_only: {
    id: 'escalate_only',
    points: Math.round(EXECUTIVE_VOICE_FINAL_ITEM_MAX_POINTS * 0.5),
    outcome: 'partial',
  },
  act_now: {
    id: 'act_now',
    points: 0,
    outcome: 'incorrect',
  },
};

// Tightened from a 50% partial-credit threshold: blanket
// "escalate everything without verifying" across all 4 items no
// longer earns partial credit -- at least some of them must actually
// be verified.
export function deriveExecutiveVoiceFinalOutcome(
  correctCount: number,
  rawTotal: number
): DecisionOutcome {
  if (correctCount === EXECUTIVE_VOICE_FINAL_ITEMS.length) {
    return 'correct';
  }

  const max =
    EXECUTIVE_VOICE_FINAL_ITEMS.length * EXECUTIVE_VOICE_FINAL_ITEM_MAX_POINTS;

  if (rawTotal >= max * 0.75) {
    return 'partial';
  }

  return 'incorrect';
}

// Sanity check: EXECUTIVE_VOICE_ROUNDS.length rounds * max 200
// (150 trust + 50 reasoning) + the final challenge's 4 * 50, must
// equal MISSION_THREE_STAGE_POINTS.voice exactly -- this stays
// correct automatically regardless of how many rounds exist.
const EXECUTIVE_VOICE_SECTION_MAX =
  EXECUTIVE_VOICE_ROUNDS.length *
    (EXECUTIVE_VOICE_CORRECT_TRUST_POINTS + EXECUTIVE_VOICE_FOLLOWUP_BONUS) +
  EXECUTIVE_VOICE_FINAL_ITEMS.length * EXECUTIVE_VOICE_FINAL_ITEM_MAX_POINTS;

if (EXECUTIVE_VOICE_SECTION_MAX !== MISSION_THREE_STAGE_POINTS.voice) {
  throw new Error(
    `Executive Voice Verification section maxes at ${EXECUTIVE_VOICE_SECTION_MAX}, expected ${MISSION_THREE_STAGE_POINTS.voice}.`
  );
}

// Derives the finalized "voice" stage outcome (used for the risk
// meter and the mission report) from the clamped section total,
// mirroring the threshold logic already used for the Stage 7 Final
// Challenge.
export function deriveExecutiveVoiceOutcome(
  clampedTotal: number
): DecisionOutcome {
  if (clampedTotal >= MISSION_THREE_STAGE_POINTS.voice * 0.7) {
    return 'correct';
  }

  if (clampedTotal >= MISSION_THREE_STAGE_POINTS.voice * 0.4) {
    return 'partial';
  }

  return 'incorrect';
}

// ==================================
// VERIFICATION PROTOCOL
// ==================================

export const VERIFICATION_STEPS = [
  {
    id: 'do_not_act',
    label: 'Do not act on the suspicious request',
  },
  {
    id: 'preserve_communication',
    label: 'Preserve the suspicious communication',
  },
  {
    id: 'verify_trusted_channel',
    label: 'Verify identity through a known trusted channel',
  },
  {
    id: 'notify_security',
    label: 'Notify the security team',
  },
  {
    id: 'check_other_employees',
    label: 'Determine whether other employees received the same message',
  },
  {
    id: 'record_incident',
    label: 'Record what happened',
  },
] as const;

export type VerificationStepId = (typeof VERIFICATION_STEPS)[number]['id'];

// Canonical order: contain first, preserve evidence before anything
// changes, verify through a separate channel, escalate, scope the
// incident, then document.
export const VERIFICATION_CORRECT_ORDER: VerificationStepId[] = [
  'do_not_act',
  'preserve_communication',
  'verify_trusted_channel',
  'notify_security',
  'check_other_employees',
  'record_incident',
];

// Per-position scoring: +VERIFICATION_POSITION_POINTS for every step
// placed in its correct position, -VERIFICATION_POSITION_PENALTY for
// every step not in its correct position. 6 positions * 50 = 300,
// matching MISSION_THREE_STAGE_POINTS.verification exactly when every
// position is correct; the raw total can go negative (e.g. all 6
// wrong = -120) and is only floored at 0 when the stage is finalized
// (clampStageScore('verification', ...)).
export const VERIFICATION_POSITION_POINTS = 50;
export const VERIFICATION_POSITION_PENALTY = 20;

export function scoreVerificationPositions(submittedOrder: string[]): {
  correctCount: number;
  wrongCount: number;
  rawPoints: number;
} {
  let correctCount = 0;

  for (let index = 0; index < VERIFICATION_CORRECT_ORDER.length; index++) {
    if (submittedOrder[index] === VERIFICATION_CORRECT_ORDER[index]) {
      correctCount++;
    }
  }

  const wrongCount = VERIFICATION_CORRECT_ORDER.length - correctCount;

  const rawPoints =
    correctCount * VERIFICATION_POSITION_POINTS -
    wrongCount * VERIFICATION_POSITION_PENALTY;

  return { correctCount, wrongCount, rawPoints };
}

// Outcome (for the risk meter / report banner) is based on how many
// positions were correct, independent of the clamped point total.
export function deriveVerificationOutcome(
  correctCount: number
): DecisionOutcome {
  if (correctCount === VERIFICATION_CORRECT_ORDER.length) {
    return 'correct';
  }

  if (correctCount >= 4) {
    return 'partial';
  }

  return 'incorrect';
}

// ==================================
// FINAL CHALLENGE (Stage 7) -- "The AI Deepfake Threat"
// ==================================
//
// Deliberately written in plain, non-technical language -- no
// "metadata," "SPF/DKIM," or "synthetic media" jargon. The goal is
// for someone with no security background to understand exactly why
// each of these is dangerous and what to actually do about it.
//
// Four near-simultaneous communications. The lesson stays
// consistent with every earlier stage: the correct response is
// always to verify through a separate trusted channel, regardless
// of whether that particular item turns out genuine or fraudulent.
// Players are not scored on guessing which ones are "real".

export const FINAL_CHALLENGE_INTRO = {
  heading: 'What Is an AI Deepfake, and Why Does It Matter?',
  paragraphs: [
    'Using only a short clip of someone\'s face or voice -- often just a few seconds from a video call or a voicemail -- AI tools can now create a very convincing fake. A fake video of someone saying something they never said. A fake phone call in a voice that sounds exactly like your manager.',
    'This means a video, a phone call, or a voice message can look and sound completely real, and still not be real.',
    'You cannot tell the difference just by watching or listening carefully enough. The only way to know for sure is to check in a different way -- for example, by calling the person back on a number you already know is theirs, not one given to you in the message itself.',
  ],
} as const;

export const FINAL_CHALLENGE_ITEMS = [
  {
    id: 'final_video',
    label: 'A video call that looks like Maya Bennett, asking you to approve an urgent payment right now.',
  },
  {
    id: 'final_voice',
    label: 'A voicemail that sounds exactly like the Finance Director, asking you to change the bank account on file.',
  },
  {
    id: 'final_email',
    label: 'An email that looks like it is from IT, asking you to type your password into a link to "fix" your account.',
  },
  {
    id: 'final_alert',
    label: 'An urgent message claiming a data breach is happening right now, telling you to act immediately and not tell anyone else.',
  },
] as const;

export type FinalChallengeItemId = (typeof FINAL_CHALLENGE_ITEMS)[number]['id'];

export const FINAL_ITEM_MAX_POINTS = Math.round(
  MISSION_THREE_STAGE_POINTS.final / FINAL_CHALLENGE_ITEMS.length
);

export const FINAL_DECISIONS: Record<string, DecisionOption> = {
  verify_independent: {
    id: 'verify_independent',
    points: FINAL_ITEM_MAX_POINTS,
    outcome: 'correct',
  },
  ignore_and_escalate: {
    id: 'ignore_and_escalate',
    points: Math.round(FINAL_ITEM_MAX_POINTS * 0.5),
    outcome: 'partial',
  },
  act_immediately: {
    id: 'act_immediately',
    points: 0,
    outcome: 'incorrect',
  },
};

// ==================================
// ORGANIZATION RISK METER
// ==================================
//
// A single, derived value -- not persisted separately. It's
// recomputed from whichever stage results already exist in
// mission_progress.progress, so there's no second source of truth
// to drift out of sync with the actual stage outcomes.

export const ORGANIZATION_RISK_BASELINE = 50;

export const RISK_DELTA_BY_OUTCOME: Record<DecisionOutcome, number> = {
  correct: -10,
  partial: -2,
  incorrect: 15,
};

export function computeOrganizationRisk(
  stageOutcomes: DecisionOutcome[]
): number {
  const raw = stageOutcomes.reduce(
    (risk, outcome) => risk + RISK_DELTA_BY_OUTCOME[outcome],
    ORGANIZATION_RISK_BASELINE
  );

  return Math.max(0, Math.min(100, raw));
}

function isDecisionOutcome(value: unknown): value is DecisionOutcome {
  return value === 'correct' || value === 'partial' || value === 'incorrect';
}

// Pulls the outcome of every stage already recorded in
// mission_progress.progress, in no particular order -- enough to
// feed computeOrganizationRisk() without caring which specific
// stages have been completed yet.
//
// "voice_rounds" is a special case: while the Executive Voice
// Verification section is still in progress (no finalized top-level
// "voice" entry yet), each already-answered round's own outcome is
// included individually so the risk meter moves round-by-round
// during the section. Once "voice" finalizes, its single outcome
// (picked up by the loop below like any other stage) already
// accounts for the whole section, so the per-round entries are
// deliberately skipped at that point to avoid double-counting.
export function extractStageOutcomes(
  progress: Record<string, unknown> | null | undefined
): DecisionOutcome[] {
  if (!progress) {
    return [];
  }

  const outcomes: DecisionOutcome[] = [];

  for (const [key, entry] of Object.entries(progress)) {
    if (key === 'voice_rounds') {
      continue;
    }

    const outcome =
      entry && typeof entry === 'object'
        ? (entry as { outcome?: unknown }).outcome
        : undefined;

    if (isDecisionOutcome(outcome)) {
      outcomes.push(outcome);
    }
  }

  const voiceRounds = progress.voice_rounds;

  if (
    !progress.voice &&
    voiceRounds &&
    typeof voiceRounds === 'object' &&
    !Array.isArray(voiceRounds)
  ) {
    for (const entry of Object.values(voiceRounds as Record<string, unknown>)) {
      const outcome =
        entry && typeof entry === 'object'
          ? (entry as { outcome?: unknown }).outcome
          : undefined;

      if (isDecisionOutcome(outcome)) {
        outcomes.push(outcome);
      }
    }
  }

  return outcomes;
}
