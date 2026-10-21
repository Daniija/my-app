'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type InitialTheory = {
  attack_method: string | null;
  initial_compromise: string | null;
  strongest_evidence: string[] | null;
  attack_sequence: string[] | null;
} | null;

type PhishingPart = {
  id: string;
  label: string;
  explanation: string;
  hotspot: {
    left: string;
    top: string;
    width: string;
    height: string;
  };
};

const evidenceOptions = [
  ['E-01', 'HR Benefits Email'],
  ['E-02', 'Project Document Email'],
  ['E-03', 'MFA Notification'],
  ['E-04', 'Login Activity Log'],
  ['E-05', 'Teams Message'],
  ['E-06', 'Calendar Invitation'],
  ['E-07', 'Browser History'],
  ['E-08', 'QR Code Poster'],
  ['E-09', 'External File Share'],
  ['E-10', 'Out of Office Reply'],
].map(([id, title]) => ({ id, title }));

const phishingParts: PhishingPart[] = [
  {
    id: 'sender_domain',
    label: 'Suspicious sender address',
    explanation:
      'The display name says IT Support, but the sender uses brightwell-secure.com instead of the normal Brightwell Group domain.',
    hotspot: {
      left: '23%',
      top: '13%',
      width: '56%',
      height: '8%',
    },
  },
  {
    id: 'external_warning',
    label: 'External sender warning',
    explanation:
      'The external warning indicates that the message came from outside the organisation.',
    hotspot: {
      left: '50%',
      top: '4%',
      width: '20%',
      height: '7%',
    },
  },
  {
    id: 'unexpected_attachment',
    label: 'Unexpected attachment',
    explanation:
      'Unexpected attachments can be used to deliver malicious files or trick the recipient into enabling unsafe content.',
    hotspot: {
      left: '3%',
      top: '24%',
      width: '40%',
      height: '11%',
    },
  },
  {
    id: 'unusual_time',
    label: 'Unusual sending time',
    explanation:
      'The timing is another clue to inspect when deciding whether a message is legitimate.',
    hotspot: {
      left: '79%',
      top: '13%',
      width: '18%',
      height: '8%',
    },
  },
  {
    id: 'urgent_language',
    label: 'Urgent or threatening language',
    explanation:
      'Phishing messages often create urgency so the recipient acts before carefully checking the request.',
    hotspot: {
      left: '2%',
      top: '45%',
      width: '60%',
      height: '8%',
    },
  },
  {
    id: 'verify_button',
    label: 'Suspicious verification button',
    explanation:
      'A button asking the recipient to verify credentials is a common phishing technique used to lead victims to fake sign-in pages.',
    hotspot: {
      left: '3%',
      top: '58%',
      width: '43%',
      height: '10%',
    },
  },
  {
    id: 'fake_url',
    label: 'Look-alike website URL',
    explanation:
      'The visible URL uses brightwell-secure.com instead of the organisation’s normal domain.',
    hotspot: {
      left: '2%',
      top: '74%',
      width: '78%',
      height: '7%',
    },
  },
];

const phishingPartIds = phishingParts.map(
  (part) => part.id
);

export default function MissionOneTheory({
  playerId,
  playerAlias,
  initialTheory,
  previewMode = false,
}: {
  playerId: string;
  playerAlias: string;
  initialTheory: InitialTheory;
  previewMode?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [attackMethod, setAttackMethod] = useState(
    initialTheory?.attack_method ?? ''
  );

  const [initialCompromise, setInitialCompromise] =
    useState(
      initialTheory?.initial_compromise ?? ''
    );

  const [strongestEvidence, setStrongestEvidence] =
    useState<string[]>(
      initialTheory?.strongest_evidence ?? []
    );

  const [identifiedParts, setIdentifiedParts] =
    useState<string[]>(() => {
      const saved =
        initialTheory?.attack_sequence ?? [];

      return saved.filter((id) =>
        phishingPartIds.includes(id)
      );
    });

  const [selectedPart, setSelectedPart] =
    useState<string | null>(null);

  // BONUS question is intentionally UI-only so this
  // update does not require a database migration.
  const [bonusConclusion, setBonusConclusion] =
    useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPartDetails = useMemo(
    () =>
      phishingParts.find(
        (part) => part.id === selectedPart
      ) ?? null,
    [selectedPart]
  );

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

  function identifyPart(id: string) {
    setSelectedPart(id);

    setIdentifiedParts((current) =>
      current.includes(id)
        ? current
        : [...current, id]
    );
  }

  const canSubmit =
    attackMethod.length > 0 &&
    initialCompromise.length > 0 &&
    strongestEvidence.length === 3 &&
    identifiedParts.length >= 4;

  async function submitTheory() {
    if (!canSubmit || saving) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (!previewMode) {
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

                // Existing text[] column reused.
                // It now stores phishing-email clue IDs
                // instead of attack-chain event IDs.
                attack_sequence:
                  identifiedParts,
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
      }

      router.push(
        previewMode
          ? '/admin/missions/1/preview/containment'
          : '/missions/1/play/containment'
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

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs uppercase text-slate-500">
                  {previewMode ? 'Administrator' : 'Operative'}
                </p>

                <p className="font-bold">
                  {playerAlias}
                </p>
              </div>

              {previewMode && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-cyan-600"
                >
                  Exit Preview
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {previewMode && (
          <div className="mb-6 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
              Admin Preview Mode
            </p>

            <p className="mt-1 text-sm text-slate-300">
              No player attempt, theory or score will be saved.
            </p>
          </div>
        )}

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
          Investigation Stage 03
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Build Your Theory
        </h2>

        <p className="mt-3 max-w-3xl leading-7 text-slate-400">
          Use the evidence to determine how the
          incident began, then inspect the phishing
          email and identify its warning signs.
        </p>

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

        <section className="mt-6 rounded-2xl border border-cyan-950 bg-[#061019] p-6">
          <QuestionNumber number="02" />

          <h3 className="mt-2 text-xl font-black">
            What was the initial point of
            compromise?
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
                  initialCompromise ===
                  option
                }
                onClick={() =>
                  setInitialCompromise(
                    option
                  )
                }
              >
                {option}
              </ChoiceButton>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-950 bg-[#061019] p-6">
          <QuestionNumber number="03" />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">
                Select the three strongest
                pieces of evidence.
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Choose the evidence that most
                directly supports your theory.
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
            {evidenceOptions.map(
              (item) => {
                const selected =
                  strongestEvidence.includes(
                    item.id
                  );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      toggleEvidence(
                        item.id
                      )
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
                        {selected
                          ? '✓'
                          : ''}
                      </div>

                      <div>
                        <p className="font-black text-cyan-300">
                          {item.id}
                        </p>

                        <p className="mt-1 text-sm">
                          {
                            item.title
                          }
                        </p>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-950 bg-[#061019] p-6">
          <QuestionNumber number="04" />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="mt-2 text-xl font-black">
                Identify the parts of the
                phishing email.
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Click the suspicious parts of
                the email image. Each hotspot
                reveals what that warning sign
                means.
              </p>
            </div>

            <div className="rounded-lg border border-cyan-900 bg-[#020b11] px-4 py-2">
              <span className="font-black text-cyan-300">
                {identifiedParts.length}
              </span>

              <span className="text-slate-500">
                {' '}
                / {phishingParts.length}{' '}
                identified
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="relative mx-auto w-full max-w-[608px] overflow-hidden rounded-xl border border-slate-700 bg-white shadow-2xl">
                <img
                  src="/images/mission-01-phishing-email.png"
                  alt="Example phishing email used for the Mission 01 investigation"
                  className="block h-auto w-full"
                  draggable={false}
                />

                {phishingParts.map(
                  (part) => {
                    const identified =
                      identifiedParts.includes(
                        part.id
                      );

                    return (
                      <button
                        key={part.id}
                        type="button"
                        aria-label={`Identify ${part.label}`}
                        onClick={() =>
                          identifyPart(
                            part.id
                          )
                        }
                        className={`absolute cursor-pointer rounded-md transition ${
                          identified
                            ? 'border-2 border-emerald-400 bg-emerald-400/15 shadow-[0_0_0_2px_rgba(16,185,129,0.20)]'
                            : 'border-0 bg-transparent'
                        }`}
                        style={
                          part.hotspot
                        }
                      >
                        {identified && (
                          <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-black">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              <p className="mt-3 text-center text-xs text-slate-600">
                Inspect the email carefully and click the areas you believe are phishing warning signs.
              </p>
            </div>

            <aside className="rounded-xl border border-slate-700 bg-[#020b11] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-400">
                Phishing Clues
              </p>

              <div className="mt-4 space-y-2">
                {phishingParts.map(
                  (part, index) => {
                    const identified =
                      identifiedParts.includes(
                        part.id
                      );

                    const active =
                      selectedPart ===
                      part.id;

                    return (
                      <button
                        key={part.id}
                        type="button"
                        disabled={
                          !identified
                        }
                        onClick={() =>
                          setSelectedPart(
                            part.id
                          )
                        }
                        className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                          active
                            ? 'border-cyan-400 bg-cyan-950/60'
                            : identified
                              ? 'border-emerald-900 bg-emerald-950/20'
                              : 'border-slate-800 bg-[#07141d] text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                              identified
                                ? 'bg-emerald-400 text-black'
                                : 'border border-slate-700'
                            }`}
                          >
                            {identified
                              ? '✓'
                              : index + 1}
                          </span>

                          <span
                            className={
                              identified
                                ? 'font-bold text-slate-200'
                                : ''
                            }
                          >
                            {identified
                              ? part.label
                              : 'Not identified'}
                          </span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {selectedPartDetails && (
                <div className="mt-5 rounded-lg border border-cyan-900 bg-cyan-950/20 p-4">
                  <p className="font-black text-cyan-300">
                    {
                      selectedPartDetails.label
                    }
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {
                      selectedPartDetails.explanation
                    }
                  </p>
                </div>
              )}

              <div className="mt-5 rounded-lg border border-slate-800 bg-[#061019] p-4">
                <p className="text-xs text-slate-500">
                  Identify at least 4 phishing
                  clues to continue.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-900/60 bg-[#061019] p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              Bonus Question
            </p>

            <span className="rounded-full border border-amber-400/50 bg-amber-950/30 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
              Optional
            </span>
          </div>

          <h3 className="mt-3 text-xl font-black">
            Investigator&apos;s conclusion
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Explain what you believe happened
            and which warning signs were most
            important. This optional response
            does not prevent you from continuing.
          </p>

          <textarea
            value={bonusConclusion}
            onChange={(event) =>
              setBonusConclusion(
                event.target.value
              )
            }
            maxLength={1000}
            placeholder="Optional: explain your reasoning..."
            className="mt-5 min-h-40 w-full resize-none rounded-xl border border-slate-700 bg-[#02080d] p-4 text-white outline-none focus:border-amber-400"
          />

          <p className="mt-2 text-right text-xs text-slate-600">
            {bonusConclusion.length}/1000
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
                previewMode
                  ? '/admin/missions/1/preview/evidence'
                  : '/missions/1/play/evidence'
              )
            }
            className="rounded-lg border border-slate-700 px-5 py-3 font-bold text-slate-300"
          >
            ← Return to Evidence
          </button>

          <button
            type="button"
            disabled={
              !canSubmit || saving
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
