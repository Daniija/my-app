'use client';

import {
  FormEvent,
  useState,
} from 'react';

export default function ForgotPasswordForm() {
  const [username, setUsername] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/auth/password-reset/request',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              username,
            }),
          }
        );

      const body =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          body?.message ??
            'Unable to submit the reset request.'
        );
      }

      setMessage(
        body?.message ??
          'Your request has been submitted.'
      );

      setUsername('');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit the reset request.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 space-y-4"
    >
      <div>
        <label
          htmlFor="reset-username"
          className="text-sm font-bold"
        >
          Username
        </label>

        <input
          id="reset-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) =>
            setUsername(
              event.target.value
            )
          }
          className="mt-2 w-full rounded-lg border border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-[var(--accent)]"
          placeholder="Enter your username"
          required
        />
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={busy}
      >
        {busy
          ? 'Submitting...'
          : 'Request Password Reset'}
      </button>
    </form>
  );
}