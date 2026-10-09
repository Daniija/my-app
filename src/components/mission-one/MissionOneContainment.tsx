'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const actions = [
  {
    id: 'revoke_sessions',
    title: 'Revoke all active sessions',
  },
  {
    id: 'reset_credentials',
    title: 'Force password and credential reset',
  },
  {
    id: 'preserve_logs',
    title: 'Preserve authentication and audit logs',
  },
  {
    id: 'disable_account',
    title: 'Temporarily restrict the compromised account',
  },
  {
    id: 'delete_logs',
    title: 'Delete suspicious logs',
  },
  {
    id: 'ignore',
    title: 'Monitor the account and take no immediate action',
  },
  {
    id: 'shutdown_network',
    title: 'Shut down the entire company network',
  },
];

export default function MissionOneContainment({
  playerId,
  playerAlias,
  initialContainment,
}: {
  playerId: string;
  playerAlias: string;
  initialContainment:
    | {
        actions: string[];
        explanation: string;
      }
    | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selected, setSelected] =
    useState<string[]>(
      initialContainment?.actions ?? []
    );

  const [explanation, setExplanation] =
    useState(
      initialContainment?.explanation ??
        ''
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

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
    setSaving(true);
    setError('');

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
      setSaving(false);
      setError(saveError.message);
      return;
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
      setSaving(false);
      setError(stageError.message);
      return;
    }

    router.push(
      '/missions/1/play/report'
    );
  }

  return (
    <main className="min-h-screen bg-[#02080d] px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
          Mission 01 • Stage 04
        </p>

        <h1 className="mt-2 text-3xl font-black">
          Containment
        </h1>

        <p className="mt-3 text-slate-400">
          The compromise has been identified.
          Select the actions that should be
          taken immediately to contain the
          incident.
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Operative: {playerAlias}
        </p>

        <section className="mt-8 rounded-2xl border border-red-900 bg-red-950/10 p-6">
          <p className="text-xs font-black uppercase tracking-wider text-red-400">
            Active Incident
          </p>

          <h2 className="mt-2 text-xl font-black">
            Maya Bennett&apos;s account is
            considered compromised.
          </h2>

          <p className="mt-3 text-slate-400">
            Sensitive Project Horizon data may
            already have left the organization.
          </p>
        </section>

        <section className="mt-6 grid gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() =>
                toggle(action.id)
              }
              className={`rounded-xl border p-5 text-left ${
                selected.includes(action.id)
                  ? 'border-cyan-400 bg-cyan-950 text-cyan-200'
                  : 'border-slate-700 bg-[#061019]'
              }`}
            >
              <div className="flex gap-4">
                <div className="mt-1 h-5 w-5 rounded border border-current">
                  {selected.includes(
                    action.id
                  )
                    ? '✓'
                    : ''}
                </div>

                <span className="font-bold">
                  {action.title}
                </span>
              </div>
            </button>
          ))}
        </section>

        <section className="mt-6 rounded-xl border border-cyan-950 bg-[#061019] p-6">
          <label>
            <span className="font-black">
              Explain your containment strategy
            </span>

            <textarea
              value={explanation}
              onChange={(event) =>
                setExplanation(
                  event.target.value
                )
              }
              maxLength={800}
              className="mt-4 min-h-32 w-full rounded-lg border border-slate-700 bg-[#02080d] p-4"
              placeholder="Why did you choose these actions?"
            />
          </label>
        </section>

        {error && (
          <div className="mt-5 rounded-lg border border-red-900 bg-red-950/30 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            disabled={
              selected.length < 2 ||
              saving
            }
            onClick={() =>
              void submit()
            }
            className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black disabled:bg-slate-700 disabled:text-slate-400"
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