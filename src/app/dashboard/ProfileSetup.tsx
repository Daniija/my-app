'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProfileSetup({
  username,
}: {
  username: string;
}) {
  const [alias, setAlias] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setMsg('');

    try {
      const clean = alias.trim().replace(/\s+/g, ' ');

      if (clean.length < 3 || clean.length > 24) {
        throw new Error('Alias must be 3–24 characters.');
      }

      const supabase = createClient();

      const { error } = await supabase.rpc('complete_agent_profile', {
        p_alias: clean,
      });

      if (error) {
        if (error.message.toLowerCase().includes('alias_taken')) {
          throw new Error('That cyber alias is already taken.');
        }

        throw error;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setMsg(
        err instanceof Error
          ? err.message
          : 'Unable to activate profile.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6 max-w-xl">
      <span className="badge">
        PLAYER @{username}
      </span>

      <h2 className="text-2xl font-black mt-4">
        Activate Your Cyber Identity
      </h2>

      <p className="muted mt-2">
        Choose the cyber alias that will appear on the leaderboard.
        Your login username stays private.
      </p>

      <form
        onSubmit={submit}
        className="mt-5 space-y-4"
      >
        <div>
          <label
            className="block text-sm font-bold mb-2"
            htmlFor="alias"
          >
            Cyber alias
          </label>

          <input
            id="alias"
            required
            maxLength={24}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
            placeholder="Agent Cipher"
          />
        </div>

        <button
          disabled={busy}
          className="btn btn-primary"
          type="submit"
        >
          {busy ? 'Activating…' : 'Activate profile'}
        </button>

        {msg && (
          <p
            role="alert"
            className="text-sm text-[#ffd2d2]"
          >
            {msg}
          </p>
        )}
      </form>
    </section>
  );
}