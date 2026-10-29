// Mission 4 challenge engine: one discriminated union covering every
// supported challenge format, plus the single pure function that
// scores an answer against one. This is the ONLY place scoring logic
// lives -- the real submit route and admin-preview's local scoring
// both call scoreChallenge(), so they can never drift apart. The 8
// presentational challenge components never grade anything
// themselves, they only collect an answer and hand it up.

import {
  DEFAULT_CORRECT_TIME_BONUS_SECONDS,
  DEFAULT_INCORRECT_TIME_PENALTY_SECONDS,
  type MissionFourStageName,
} from './mission-four-scoring';

export type MissionFourChallengeType =
  | 'multiple_choice'
  | 'multi_select'
  | 'sequence'
  | 'classification'
  | 'evidence_selection'
  | 'passcode_entry'
  | 'decision_scenario'
  | 'network_node_selection';

type BaseChallenge = {
  id: string;
  stage: MissionFourStageName;
  title: string;
  briefing?: string;
  prompt: string;
  points: number;
  // Per-challenge override; falls back to the DEFAULT_* constants in
  // mission-four-scoring.ts when omitted, so most content doesn't
  // need to specify these at all.
  timeBonusSeconds?: number;
  timePenaltySeconds?: number;
  // Points lost for a wrong answer. Defaults to this challenge's own
  // `points` value (i.e. you lose exactly what a correct answer
  // would have earned) when omitted -- see scoreChallenge() below.
  pointPenalty?: number;
  explanation?: string;
  // Marks placeholder/demo content so it's visually unmistakable
  // while still in that state; omitted (or false) for real content.
  demo?: boolean;
};

export type MultipleChoiceChallenge = BaseChallenge & {
  type: 'multiple_choice';
  options: { id: string; label: string }[];
  correctOptionId: string;
};

export type MultiSelectChallenge = BaseChallenge & {
  type: 'multi_select';
  options: { id: string; label: string }[];
  correctOptionIds: string[];
};

export type SequenceChallenge = BaseChallenge & {
  type: 'sequence';
  items: { id: string; label: string }[];
  correctOrder: string[];
};

export type ClassificationChallenge = BaseChallenge & {
  type: 'classification';
  items: { id: string; label: string }[];
  categories: { id: string; label: string }[];
  correctCategoryByItemId: Record<string, string>;
};

export type EvidenceSelectionChallenge = BaseChallenge & {
  type: 'evidence_selection';
  evidenceItems: { id: string; label: string; content: string }[];
  correctEvidenceIds: string[];
};

export type PasscodeEntryChallenge = BaseChallenge & {
  type: 'passcode_entry';
  hint: string;
  correctCode: string;
};

export type DecisionScenarioChallenge = BaseChallenge & {
  type: 'decision_scenario';
  scenario: string;
  options: {
    id: string;
    label: string;
    outcome: 'correct' | 'partial' | 'incorrect';
    points: number;
  }[];
};

export type NetworkNodeSelectionChallenge = BaseChallenge & {
  type: 'network_node_selection';
  nodes: { id: string; label: string; connections: string[] }[];
  correctNodeIds: string[];
};

export type MissionFourChallenge =
  | MultipleChoiceChallenge
  | MultiSelectChallenge
  | SequenceChallenge
  | ClassificationChallenge
  | EvidenceSelectionChallenge
  | PasscodeEntryChallenge
  | DecisionScenarioChallenge
  | NetworkNodeSelectionChallenge;

// The answer shapes a player can submit -- deliberately mirrors each
// challenge type's own data shape, so the renderer/engine stay in sync.
export type MissionFourAnswer =
  | { type: 'multiple_choice'; optionId: string }
  | { type: 'multi_select'; optionIds: string[] }
  | { type: 'sequence'; order: string[] }
  | { type: 'classification'; categoryByItemId: Record<string, string> }
  | { type: 'evidence_selection'; evidenceIds: string[] }
  | { type: 'passcode_entry'; code: string }
  | { type: 'decision_scenario'; optionId: string }
  | { type: 'network_node_selection'; nodeIds: string[] };

export type ChallengeScoreResult = {
  outcome: 'correct' | 'partial' | 'incorrect';
  points: number;
  timeDeltaSeconds: number; // signed: positive bonus, negative penalty
};

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((item) => setA.has(item));
}

// Pure dispatcher -- no DB/network access, safe to call both
// server-side (authoritative) and client-side (admin-preview
// simulation only).
export function scoreChallenge(
  challenge: MissionFourChallenge,
  answer: MissionFourAnswer
): ChallengeScoreResult {
  const bonus = challenge.timeBonusSeconds ?? DEFAULT_CORRECT_TIME_BONUS_SECONDS;
  const penalty = challenge.timePenaltySeconds ?? DEFAULT_INCORRECT_TIME_PENALTY_SECONDS;

  const correct = (): ChallengeScoreResult => ({
    outcome: 'correct',
    points: challenge.points,
    timeDeltaSeconds: bonus,
  });

  const pointPenalty = challenge.pointPenalty ?? challenge.points;

  const incorrect = (): ChallengeScoreResult => ({
    outcome: 'incorrect',
    points: -pointPenalty,
    timeDeltaSeconds: -penalty,
  });

  switch (challenge.type) {
    case 'multiple_choice': {
      if (answer.type !== 'multiple_choice') return incorrect();
      return answer.optionId === challenge.correctOptionId ? correct() : incorrect();
    }

    case 'multi_select': {
      if (answer.type !== 'multi_select') return incorrect();
      return sameMembers(answer.optionIds, challenge.correctOptionIds)
        ? correct()
        : incorrect();
    }

    case 'sequence': {
      if (answer.type !== 'sequence') return incorrect();
      const isCorrect =
        answer.order.length === challenge.correctOrder.length &&
        answer.order.every((id, index) => id === challenge.correctOrder[index]);
      return isCorrect ? correct() : incorrect();
    }

    case 'classification': {
      if (answer.type !== 'classification') return incorrect();
      const entries = Object.entries(challenge.correctCategoryByItemId);
      const correctCount = entries.filter(
        ([itemId, categoryId]) => answer.categoryByItemId[itemId] === categoryId
      ).length;

      if (correctCount === entries.length) return correct();
      if (correctCount > 0) {
        return {
          outcome: 'partial',
          points: Math.round(
            (challenge.points * correctCount) / entries.length
          ),
          timeDeltaSeconds: 0,
        };
      }
      return incorrect();
    }

    case 'evidence_selection': {
      if (answer.type !== 'evidence_selection') return incorrect();
      return sameMembers(answer.evidenceIds, challenge.correctEvidenceIds)
        ? correct()
        : incorrect();
    }

    case 'passcode_entry': {
      if (answer.type !== 'passcode_entry') return incorrect();
      return answer.code.trim().toUpperCase() ===
        challenge.correctCode.trim().toUpperCase()
        ? correct()
        : incorrect();
    }

    case 'decision_scenario': {
      if (answer.type !== 'decision_scenario') return incorrect();
      const option = challenge.options.find((o) => o.id === answer.optionId);
      if (!option) return incorrect();

      return {
        outcome: option.outcome,
        points: option.points,
        timeDeltaSeconds:
          option.outcome === 'correct'
            ? bonus
            : option.outcome === 'incorrect'
              ? -penalty
              : 0,
      };
    }

    case 'network_node_selection': {
      if (answer.type !== 'network_node_selection') return incorrect();
      return sameMembers(answer.nodeIds, challenge.correctNodeIds)
        ? correct()
        : incorrect();
    }

    default: {
      // Exhaustiveness guard -- a new challenge type added to the
      // union without a case here is a compile error, not a silent
      // runtime fallback.
      const _exhaustive: never = challenge;
      return _exhaustive;
    }
  }
}
