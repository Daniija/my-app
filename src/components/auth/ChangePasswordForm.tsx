'use client';

import {
  FormEvent,
  useState,
} from 'react';

export default function ChangePasswordForm() {
  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  const [
    busy,
    setBusy,
  ] = useState(false);

  async function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');

    if (
      password.length <
        8 ||
      !/[A-Za-z]/.test(
        password
      ) ||
      !/[0-9]/.test(
        password
      )
    ) {
      setError(
        'Password must be at least 8 characters and contain at least one letter and one number.'
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Passwords do not match.'
      );

      return;
    }

    setBusy(true);

    try {
      const response =
        await fetch(
          '/api/auth/password-reset/change',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                password,
              }),
          }
        );

      const body =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok
      ) {
        throw new Error(
          body?.message ??
            'Unable to change password.'
        );
      }

      window.location.assign(
        '/dashboard'
      );
    } catch (error) {
      setError(
        error instanceof
          Error
          ? error.message
          : 'Unable to change password.'
      );

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
          htmlFor="new-password"
          className="mb-2 block text-sm font-bold"
        >
          New password
        </label>

        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
          required
          minLength={8}
          maxLength={72}
        />
      </div>

      <div>
        <label
          htmlFor="confirm-new-password"
          className="mb-2 block text-sm font-bold"
        >
          Confirm new password
        </label>

        <input
          id="confirm-new-password"
          type="password"
          autoComplete="new-password"
          value={
            confirmPassword
          }
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
          required
          minLength={8}
          maxLength={72}
        />
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={busy}
      >
        {busy
          ? 'Updating…'
          : 'Set New Password'}
      </button>
    </form>
  );
}