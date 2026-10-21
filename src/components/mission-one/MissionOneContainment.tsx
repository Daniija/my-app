'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const actions = [
  {
    id: 'maya_report_it',
    title: 'Report it to IT / Cybersecurity immediately',
    description:
      'Tell the security team that you clicked a suspicious link and may have entered your credentials so they can respond quickly.',
  },
  {
    id: 'maya_change_password',
    title: 'Change your password using the official company sign-in page',
    description:
      'Open the trusted company portal yourself and change the password. Do not use any link from the suspicious email.',
  },
  {
    id: 'maya_sign_out_sessions',
    title: 'Sign out of all active sessions',
    description:
      'Use the official account-security page, or ask IT to revoke active sessions, so anyone already signed in with the stolen credentials is removed.',
  },
  {
    id: 'maya_preserve_email',
    title: 'Keep the suspicious email and provide it to IT',
    description:
      'Do not destroy the evidence. Keep the message, sender details and link available so the security team can investigate.',
  },
  {
    id: 'maya_delete_and_hide',
    title: 'Delete the email and do not tell anyone',
    description:
      'Remove the message and hope the problem goes away so no one knows you clicked it.',
  },
  {
    id: 'maya_wait',
    title: 'Wait to see if anything unusual happens',
    description:
      'Continue using the account normally and only report it if you notice another problem later.',
  },
  {
    id: 'maya_approve_mfa',
    title: 'Approve any MFA request that appears',
    description:
      'Approve the authentication request because it may be part of the verification process.',
  },
  {
    id: 'maya_reply_sender',
    title: 'Reply to the sender and ask if the email is real',
    description:
      'Respond directly to the suspicious message and wait for the sender to confirm whether the request is legitimate.',
  },
];

export default function MissionOneContainment({
  playerId,
  playerAlias,
  initialContainment,
  previewMode = false,
}: {
  playerId: string;
  playerAlias: string;
  initialContainment: {
    actions: string[];
    explanation: string;
  } | null;
  previewMode?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selected, setSelected] = useState<string[]>(
    initialContainment?.actions ?? []
  );

  const [explanation, setExplanation] = useState(
    initialContainment?.explanation ?? ''
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    );
  }

  async function submit() {
    if (
      selected.length < 2 ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (!previewMode) {
        const { error: saveError } =
          await supabase
            .from('mission_containment')
            .upsert(
              {
                player_id: playerId,
                mission_id: 1,
                actions: selected,
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

        if (saveError) {
          throw new Error(
            saveError.message
          );
        }

        const { error: stageError } =
          await supabase
            .from('mission_attempts')
            .update({
              current_stage: 'report',
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
          ? '/admin/missions/1/preview/report'
          : '/missions/1/play/report'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save containment response.'
      );

      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#02080d] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        {previewMode && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                Admin Preview Mode
              </p>

              <p className="mt-1 text-sm text-slate-300">
                No player attempt, containment response or score will be
                saved.
              </p>
            </div>

            <Link
              href="/admin"
              className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-950/40"
            >
              Exit Preview
            </Link>
          </div>
        )}

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              Mission 01 • Stage 04
            </p>

            <h1 className="mt-2 text-3xl font-black">
              What Should Maya Do?
            </h1>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase text-slate-500">
              {previewMode ? 'Administrator' : 'Operative'}
            </p>

            <p className="font-bold">
              {playerAlias}
            </p>
          </div>
        </header>

        <p className="mt-3 max-w-3xl leading-7 text-slate-400">
          Put yourself in Maya&apos;s shoes.
          You have just realised that you may
          have clicked a phishing link and
          entered your company credentials.
          What should you do now?
        </p>

        <section className="mt-8 rounded-2xl border border-red-900 bg-red-950/10 p-6">
          <p className="text-xs font-black uppercase tracking-wider text-red-400">
            Maya&apos;s Situation
          </p>

          <h2 className="mt-2 text-xl font-black">
            You may have given an attacker
            access to your work account.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Choose the actions you believe Maya
            should take immediately. Some choices
            will help contain the incident, while
            others could make the situation worse.
          </p>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-400">
                Your Response
              </p>

              <h3 className="mt-1 text-lg font-black">
                What would you do if you were Maya?
              </h3>
            </div>

            <div className="rounded-lg border border-cyan-900 bg-[#061019] px-4 py-2 text-sm">
              <span className="font-black text-cyan-300">
                {selected.length}
              </span>
              <span className="text-slate-500">
                {' '}selected
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {actions.map((action) => {
              const checked =
                selected.includes(
                  action.id
                );

              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() =>
                    toggle(action.id)
                  }
                  className={`rounded-xl border p-5 text-left transition ${
                    checked
                      ? 'border-cyan-400 bg-cyan-950 text-cyan-200'
                      : 'border-slate-700 bg-[#061019] hover:border-cyan-800'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-current">
                      {checked
                        ? '✓'
                        : ''}
                    </div>

                    <div>
                      <span className="font-bold">
                        {action.title}
                      </span>

                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {
                          action.description
                        }
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-amber-900/60 bg-[#061019] p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              Bonus Question
            </p>

            <span className="rounded-full border border-amber-400/50 bg-amber-950/30 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
              Optional
            </span>
          </div>

          <label>
            <span className="mt-3 block text-xl font-black">
              Explain your response
            </span>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Why would these actions help Maya
              protect her account and help the
              security team respond? This response
              is optional and will not prevent you
              from continuing.
            </p>

            <textarea
              value={explanation}
              onChange={(event) =>
                setExplanation(
                  event.target.value
                )
              }
              maxLength={800}
              className="mt-4 min-h-32 w-full rounded-lg border border-slate-700 bg-[#02080d] p-4 outline-none focus:border-amber-400"
              placeholder="Optional: explain why you chose these actions..."
            />
          </label>

          <p className="mt-2 text-right text-xs text-slate-600">
            {explanation.length}/800
          </p>
        </section>

        {error && (
          <div className="mt-5 rounded-lg border border-red-900 bg-red-950/30 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="mt-7 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                previewMode
                  ? '/admin/missions/1/preview/theory'
                  : '/missions/1/play/theory'
              )
            }
            className="rounded-lg border border-slate-700 px-5 py-3 font-bold text-slate-300"
          >
            ← Review Theory
          </button>

          <button
            type="button"
            disabled={
              selected.length < 2 ||
              saving
            }
            onClick={() =>
              void submit()
            }
            className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {saving
              ? 'Securing Incident...'
              : 'Generate Breach Report →'}
          </button>
        </div>
      </div>
    </main>
  );
}
