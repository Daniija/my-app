'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileEditForm({
  username: initialUsername,
  alias: initialAlias,
}: {
  username: string;
  alias: string;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [alias, setAlias] = useState(initialAlias);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setMessage('');
    setIsError(false);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, alias }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || `Unable to update your profile (${response.status}).`
        );
      }

      setMessage('Profile updated.');
      router.refresh();
    } catch (err) {
      setIsError(true);
      setMessage(
        err instanceof Error ? err.message : 'Unable to update your profile.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="username" className="block text-sm font-bold mb-2">
          Name
        </label>

        <input
          id="username"
          required
          minLength={3}
          maxLength={20}
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
        />

        <p className="muted mt-2 text-xs">
          Used to sign in. 3–20 characters: letters, numbers, underscores or
          hyphens. Stays private from other players.
        </p>
      </div>

      <div>
        <label htmlFor="alias" className="block text-sm font-bold mb-2">
          Cyber alias
        </label>

        <input
          id="alias"
          required
          maxLength={24}
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
        />

        <p className="muted mt-2 text-xs">
          Shown on the leaderboard. 3–24 characters.
        </p>
      </div>

      <button disabled={busy} className="btn btn-primary" type="submit">
        {busy ? 'Saving…' : 'Save changes'}
      </button>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm ${isError ? 'text-[#ffd2d2]' : 'muted'}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
