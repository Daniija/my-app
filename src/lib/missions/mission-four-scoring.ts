// Centralized Mission 4 ("Zero Hour") scoring and timer constants.
// DEMO VALUES -- every number in this file is a placeholder to prove
// the scoring/timer arithmetic is self-consistent, not a final
// design decision. A future content pass should only need to touch
// this file and mission-four-data.ts, never the engine code.

// ==================================
// TIMER
// ==================================

// Default mission duration. Configurable -- change this one constant
// (and the matching literal inside the two SQL functions, currently
// set in migration 022_mission_four_duration_update.sql which
// supersedes migration 020_mission_four_stage_machine.sql's original
// value, since SQL can't import this file) to retune the whole
// mission's length.
export const MISSION_FOUR_DURATION_SECONDS = 90;

export type MissionFourIntensity =
  | 'normal'
  | 'warning'
  | 'critical'
  | 'zero_hour';

// Remaining-seconds thresholds, inclusive at the boundary (">= 5:00"
// is still NORMAL; "<= 5:00" becomes WARNING).
export const INTENSITY_THRESHOLD_SECONDS = {
  warning: 5 * 60,
  critical: 2 * 60,
  zeroHour: 60,
} as const;

export function computeIntensity(remainingSeconds: number): MissionFourIntensity {
  if (remainingSeconds <= INTENSITY_THRESHOLD_SECONDS.zeroHour) return 'zero_hour';
  if (remainingSeconds <= INTENSITY_THRESHOLD_SECONDS.critical) return 'critical';
  if (remainingSeconds <= INTENSITY_THRESHOLD_SECONDS.warning) return 'warning';
  return 'normal';
}

// Shared by the client timer hook and (conceptually -- SQL
// reimplements this natively, see migration 020) the two RPCs. Never
// allows remaining time below zero.
export function computeRemainingSeconds({
  startedAtMs,
  netAdjustmentSeconds,
  nowMs,
  durationSeconds = MISSION_FOUR_DURATION_SECONDS,
}: {
  startedAtMs: number;
  netAdjustmentSeconds: number;
  nowMs: number;
  durationSeconds?: number;
}): number {
  const elapsedSeconds = Math.floor((nowMs - startedAtMs) / 1000);
  const remaining = durationSeconds + netAdjustmentSeconds - elapsedSeconds;
  return Math.max(0, remaining);
}

export function isExpired(remainingSeconds: number): boolean {
  return remainingSeconds <= 0;
}

// ==================================
// SCORING
// ==================================

export const MISSION_FOUR_MAX_SCORE = 3000; // matches missions.max_score for id=4

export const MISSION_FOUR_STAGE_POINTS = {
  triage: 700,
  trace: 700,
  contain: 800,
  disarm: 800,
} as const;

export type MissionFourStageName = keyof typeof MISSION_FOUR_STAGE_POINTS;

export const MISSION_FOUR_STAGE_ORDER: MissionFourStageName[] = [
  'triage',
  'trace',
  'contain',
  'disarm',
];

// Sanity check the breakdown always sums to the advertised maximum --
// same pattern mission-three-scoring.ts uses, catching a bad edit at
// import time rather than at a player's expense.
const STAGE_POINT_SUM = Object.values(MISSION_FOUR_STAGE_POINTS).reduce(
  (sum, points) => sum + points,
  0
);

if (STAGE_POINT_SUM !== MISSION_FOUR_MAX_SCORE) {
  throw new Error(
    `MISSION_FOUR_STAGE_POINTS sums to ${STAGE_POINT_SUM}, expected ${MISSION_FOUR_MAX_SCORE}.`
  );
}

export function clampStageScore(stage: MissionFourStageName, rawScore: number): number {
  const max = MISSION_FOUR_STAGE_POINTS[stage];
  return Math.max(0, Math.min(max, Math.round(rawScore)));
}

export function clampMissionScore(rawTotal: number): number {
  return Math.max(0, Math.min(MISSION_FOUR_MAX_SCORE, Math.round(rawTotal)));
}

// ==================================
// TIME PENALTY / BONUS
// ==================================
// Reusable, signed-delta helpers. The caller decides the magnitude
// (from a challenge's own config, falling back to these defaults) --
// these functions only apply it consistently and keep the sign
// convention (bonus positive, penalty negative) in one place.

export const DEFAULT_CORRECT_TIME_BONUS_SECONDS = 5;
export const DEFAULT_INCORRECT_TIME_PENALTY_SECONDS = 5;
export const STAGE_COMPLETION_BONUS_SECONDS = 30;
export const MISSION_COMPLETION_TIME_BONUS_PER_SECOND = 2; // points per remaining second at disarm completion

export function applyTimePenalty(netAdjustmentSeconds: number, seconds: number): number {
  return netAdjustmentSeconds - Math.abs(seconds);
}

export function addTimeBonus(netAdjustmentSeconds: number, seconds: number): number {
  return netAdjustmentSeconds + Math.abs(seconds);
}
