'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type InitialTheory = {
  attack_method: string;
  initial_compromise: string;
  strongest_evidence: string[];
  attack_sequence: string[];
  explanation: string;
} | null;

type SequenceItem = {
  id: string;
  label: string;
};

const evidenceOptions = [
  {
    id: 'E-01',
    title: 'HR Benefits Email',
  },
  {
    id: 'E-02',
    title: 'Project Document Email',
  },
  {
    id: 'E-03',
    title: 'MFA Notification',
  },
  {
    id: 'E-04',
    title: 'Login Activity Log',
  },
  {
    id: 'E-05',
    title: 'Teams Message',
  },
  {
    id: 'E-06',
    title: 'Calendar Invitation',
  },
  {
    id: 'E-07',
    title: 'Browser History',
  },
  {
    id: 'E-08',
    title: 'QR Code Poster',
  },
  {
    id: 'E-09',
    title: 'External File Share',
  },
  {
    id: 'E-10',
    title: 'Out of Office Reply',
  },
];

const sequenceOptions: SequenceItem[] = [
  {
    id: 'restricted_access',
    label: 'Restricted folder accessed',
  },
  {
    id: 'phishing_email',
    label: 'Phishing email delivered',
  },
  {
    id: 'external_share',
    label: 'Sensitive file shared externally',
  },
  {
    id: 'credentials_stolen',
    label: 'Credentials captured',
  },
  {
    id: 'mfa_approved',
    label: 'MFA request approved',
  },
  {
    id: 'fake_login',
    label: 'Fake login page opened',
  },
  {
    id: 'attacker_login',
    label: 'Attacker signs in',
  },
];

export default function MissionOneTheory({
  playerId,
  playerAlias,
  initialTheory,
}: {
  playerId: string;
  playerAlias: string;
  initialTheory: InitialTheory;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [attackMethod, setAttackMethod] =
    useState(initialTheory?.attack_method ?? '');

  const [initialCompromise, setInitialCompromise] =
    useState(
      initialTheory?.initial_compromise ?? ''
    );

  const [strongestEvidence, setStrongestEvidence] =
    useState<string[]>(
      initialTheory?.strongest_evidence ?? []
    );

  const [attackSequence, setAttackSequence] =
    useState<string[]>(
      initialTheory?.attack_sequence?.length === 7
        ? initialTheory.attack_sequence
        : sequenceOptions.map((item) => item.id)
    );

  const [explanation, setExplanation] =
    useState(initialTheory?.explanation ?? '');

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  function toggleEvidence(id: string) {
    setStrongestEvidence((current) => {
      if (current.includes(id)) {
        return current.filter(
          (item) => item !== id
        );
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, id];
    });
  }

  function moveSequence(
    index: number,
    direction: 'up' | 'down'
  ) {
    setAttackSequence((current) => {
      const targetIndex =
        direction === 'up'
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];

      [next[index], next[targetIndex]] = [
        next[targetIndex],
        next[index],
      ];

      return next;
    });
  }

  const canSubmit =
    attackMethod.length > 0 &&
    initialCompromise.length > 0 &&
    strongestEvidence.length === 3 &&
    attackSequence.length === 7;

  async function submitTheory() {
    if (!canSubmit || saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: theoryError } =
        await supabase
          .from('mission_theories')
          .upsert(
            {
              player_id: playerId,
              mission_id: 1,
              attack_method: attackMethod,
              initial_compromise:
                initialCompromise,
              strongest_evidence:
                strongestEvidence,
              attack_sequence:
                attackSequence,
              explanation:
                explanation.trim(),
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                'player_id,mission_id',
            }
          );

      if (theoryError) {
        throw new Error(
          theoryError.message
        );
      }

      const { error: stageError } =
        await supabase
          .from('mission_attempts')
          .update({
            current_stage: 'containment',
          })
          .eq('player_id', playerId)
          .eq('mission_id', 1);

      if (stageError) {
        throw new Error(
          stageError.message
        );
      }

      router.push(
        '/missions/1/play/containment'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save your theory.'
      );

      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#02080d] text-white">
      {/* HEADER */}

      <header className="border-b border-cyan-950 bg-[#061019]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                Mission 01
              </p>

              <h1 className="text-xl font-black">
                THE BREACH
              </h1>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase text-slate-500">
                Operative
              </p>

              <p className="font-bold">
                {playerAlias}
              </p>
            </div>
          </div>

          {/* MISSION PROGRESS */}

          <div className="mt-6 grid grid-cols-5 gap-2 text-center text-[10px] uppercase tracking-wider">
            <ProgressStep
              label="Briefing"
              state="complete"
            />

            <ProgressStep
              label="Evidence Room"
              state="complete"
            />

            <ProgressStep
              label="Build Your Theory"
              state="active"
            />

            <ProgressStep
              label="Containment"
              state="locked"
            />

            <ProgressStep
              label="Breach Report"
              state="locked"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
          Investigation Stage 03
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Build Your Theory
        </h2>

        <p className="mt-3 max-w-3xl leading-7 text-slate-400">
          The evidence has been collected.
          Reconstruct the attack based on what
          you discovered. You will not receive
          correctness feedback until the breach
          report is generated.
        </p>

        {/* ATTACK METHOD */}

        <section className="mt-8 rounded-2xl border border-cyan-950 bg-[#061019] p-6">
          <QuestionNumber number="01" />

          <h3 className="mt-2 text-xl font-black">
            What was the primary attack method?
          </h3>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              'Phishing',
              'Malware',
              'Password spraying',
              'Insider threat',
            ].map((option) => (
              <ChoiceButton
                key={option}
                selected={
                  attackMethod === option
                }
                onClick={() =>
                  setAttackMethod(option)
                }
              >
                {option}
              </ChoiceButton>
            ))}
          </div>
        </section>

        {/* INITIAL COMPROMISE */}

        <section className="mt-6 rounded-2xl border border-cyan-950 bg-[#061019] p-6">
          <QuestionNumber number="02" />

          <h3 className="mt-2 text-xl font-black">
            What was the initial point of compromise?
          </h3>

          <div className="mt-5 grid gap-3">
            {[
              'The fake Project Horizon document link',
              'The QR security poster',
              'The Teams message',
              'The calendar invitation',
            ].map((option) => (
              <ChoiceButton
                key={option}
                selected={
                  initialCompromise === option
                }
                onClick={() =>
                  setInitialCompromise(option)
                }
              >
                {option}
              </ChoiceButton>
            ))}
          </div>
        </section>

        {/* STRONGEST EVIDENCE */}

        <section className="mt-6 rounded-2xl border border-cyan-950 bg-[#061019] p-6">
          <QuestionNumber number="03" />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">
                Select the three strongest pieces of evidence.
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Choose the evidence that most directly
                proves how the account was compromised.
              </p>
            </div>

            <div className="rounded-lg border border-cyan-900 bg-[#020b11] px-4 py-2">
              <span className="font-black text-cyan-300">
                {strongestEvidence.length}
              </span>

              <span className="text-slate-500">
                {' '}
                / 3 selected
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {evidenceOptions.map((item) => {
              const selected =
                strongestEvidence.includes(
                  item.id
                );

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    toggleEvidence(item.id)
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    selected
                      ? 'border-cyan-400 bg-cyan-950/60'
                      : 'border-slate-700 bg-[#07141d] hover:border-cyan-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
                        selected
                          ? 'border-cyan-400 bg-cyan-400 font-black text-black'
                          : 'border-slate-600'
                      }`}
                    >
                      {selected ? '✓' : ''}
                    </div>

                    <div>
                      <p className="font-black text-cyan-300">
                        {item.id}
                      </p>

                      <p className="mt-1 text-sm">
                        {item.title}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ATTACK CHAIN */}

        <section className="mt-6 rounded-2xl border border-cyan-950 bg-[#061019] p-6">
          <QuestionNumber number="04" />

          <h3 className="mt-2 text-xl font-black">
            Reconstruct the attack chain.
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            The events below are deliberately
            out of order. Move them until they
            show what happened from the first
            attacker action to the final data
            exposure.
          </p>

          <div className="mt-6 space-y-3">
            {attackSequence.map(
              (eventId, index) => {
                const item =
                  sequenceOptions.find(
                    (option) =>
                      option.id === eventId
                  );

                if (!item) {
                  return null;
                }

                return (
                  <div
                    key={eventId}
                    className="flex items-center gap-3 rounded-xl border border-slate-700 bg-[#07141d] p-4"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-800 bg-[#02080d] font-black text-cyan-300">
                      {index + 1}
                    </div>

                    <p className="flex-1 font-bold">
                      {item.label}
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={
                          index === 0
                        }
                        onClick={() =>
                          moveSequence(
                            index,
                            'up'
                          )
                        }
                        aria-label={`Move ${item.label} up`}
                        className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-black hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        disabled={
                          index ===
                          attackSequence.length - 1
                        }
                        onClick={() =>
                          moveSequence(
                            index,
                            'down'
                          )
                        }
                        aria-label={`Move ${item.label} down`}
                        className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-black hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* EXPLANATION */}

        <section className="mt-6 rounded-2xl border border-cyan-950 bg-[#061019] p-6">
          <QuestionNumber number="05" />

          <h3 className="mt-2 text-xl font-black">
            Investigator&apos;s conclusion
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Briefly explain how you believe the
            breach occurred.
          </p>

          <textarea
            value={explanation}
            onChange={(event) =>
              setExplanation(
                event.target.value
              )
            }
            maxLength={1000}
            placeholder="Explain what happened based on the evidence..."
            className="mt-5 min-h-40 w-full resize-none rounded-xl border border-slate-700 bg-[#02080d] p-4 text-white outline-none focus:border-cyan-400"
          />

          <p className="mt-2 text-right text-xs text-slate-600">
            {explanation.length}/1000
          </p>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() =>
              router.push(
                '/missions/1/play/evidence'
              )
            }
            className="rounded-lg border border-slate-700 px-5 py-3 font-bold text-slate-300"
          >
            ← Return to Evidence
          </button>

          <button
            type="button"
            disabled={
              !canSubmit ||
              saving
            }
            onClick={() =>
              void submitTheory()
            }
            className="rounded-lg bg-cyan-400 px-7 py-3 font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {saving
              ? 'Securing Theory...'
              : 'Proceed to Containment →'}
          </button>
        </div>
      </div>
    </main>
  );
}

function QuestionNumber({
  number,
}: {
  number: string;
}) {
  return (
    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
      Question {number}
    </p>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left font-bold transition ${
        selected
          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
          : 'border-slate-700 bg-[#07141d] hover:border-cyan-700'
      }`}
    >
      {children}
    </button>
  );
}

function ProgressStep({
  label,
  state,
}: {
  label: string;
  state:
    | 'complete'
    | 'active'
    | 'locked';
}) {
  return (
    <div
      className={
        state === 'complete'
          ? 'text-emerald-400'
          : state === 'active'
            ? 'text-cyan-300'
            : 'text-slate-600'
      }
    >
      <div
        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border ${
          state === 'complete'
            ? 'border-emerald-400'
            : state === 'active'
              ? 'border-cyan-400 bg-cyan-950'
              : 'border-slate-700'
        }`}
      >
        {state === 'complete'
          ? '✓'
          : state === 'active'
            ? '●'
            : '○'}
      </div>

      <p className="mt-2">
        {label}
      </p>
    </div>
  );
}