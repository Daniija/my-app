'use client';

import type {
  MissionFourAnswer,
  MissionFourChallenge,
} from '@/lib/missions/mission-four-challenge-engine';

import MultipleChoiceChallenge from './challenges/MultipleChoiceChallenge';
import MultiSelectChallenge from './challenges/MultiSelectChallenge';
import SequenceChallenge from './challenges/SequenceChallenge';
import ClassificationChallenge from './challenges/ClassificationChallenge';
import EvidenceSelectionChallenge from './challenges/EvidenceSelectionChallenge';
import PasscodeEntryChallenge from './challenges/PasscodeEntryChallenge';
import DecisionScenarioChallenge from './challenges/DecisionScenarioChallenge';
import NetworkNodeSelectionChallenge from './challenges/NetworkNodeSelectionChallenge';

// Dispatches on challenge.type to one of the 8 presentational
// sub-components. No scoring logic lives here or in any of them --
// scoreChallenge() (mission-four-challenge-engine.ts) is the only
// place that happens, server-side for real play and locally for
// admin preview.
export default function ChallengeRenderer({
  challenge,
  disabled,
  onSubmit,
}: {
  challenge: MissionFourChallenge;
  disabled: boolean;
  onSubmit: (answer: MissionFourAnswer) => void;
}) {
  switch (challenge.type) {
    case 'multiple_choice':
      return (
        <MultipleChoiceChallenge
          challenge={challenge}
          disabled={disabled}
          onSubmit={(optionId) => onSubmit({ type: 'multiple_choice', optionId })}
        />
      );

    case 'multi_select':
      return (
        <MultiSelectChallenge
          challenge={challenge}
          disabled={disabled}
          onSubmit={(optionIds) => onSubmit({ type: 'multi_select', optionIds })}
        />
      );

    case 'sequence':
      return (
        <SequenceChallenge
          challenge={challenge}
          disabled={disabled}
          onSubmit={(order) => onSubmit({ type: 'sequence', order })}
        />
      );

    case 'classification':
      return (
        <ClassificationChallenge
          challenge={challenge}
          disabled={disabled}
          onSubmit={(categoryByItemId) =>
            onSubmit({ type: 'classification', categoryByItemId })
          }
        />
      );

    case 'evidence_selection':
      return (
        <EvidenceSelectionChallenge
          challenge={challenge}
          disabled={disabled}
          onSubmit={(evidenceIds) => onSubmit({ type: 'evidence_selection', evidenceIds })}
        />
      );

    case 'passcode_entry':
      return (
        <PasscodeEntryChallenge
          challenge={challenge}
          disabled={disabled}
          onSubmit={(code) => onSubmit({ type: 'passcode_entry', code })}
        />
      );

    case 'decision_scenario':
      return (
        <DecisionScenarioChallenge
          challenge={challenge}
          disabled={disabled}
          onSubmit={(optionId) => onSubmit({ type: 'decision_scenario', optionId })}
        />
      );

    case 'network_node_selection':
      return (
        <NetworkNodeSelectionChallenge
          challenge={challenge}
          disabled={disabled}
          onSubmit={(nodeIds) => onSubmit({ type: 'network_node_selection', nodeIds })}
        />
      );

    default: {
      const _exhaustive: never = challenge;
      return _exhaustive;
    }
  }
}
