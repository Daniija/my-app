'use client';

import Link from 'next/link';
import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

import {
  isValidUsername,
  normalizeUsername,
  usernameToAuthEmail,
  validatePassword,
} from '@/lib/auth/username';

function friendlyAuthError(
  message: string
) {
  const value =
    message.toLowerCase();

  if (
    value.includes(
      'invalid login credentials'
    )
  ) {
    return 'Username or password is incorrect.';
  }

  if (
    value.includes(
      'too many'
    ) ||
    value.includes('rate')
  ) {
    return 'Too many attempts were made. Wait briefly, then try again.';
  }

  if (
    value.includes(
      'valid username'
    )
  ) {
    return 'Enter a valid username using 3–20 letters, numbers, underscores or hyphens.';
  }

  return 'We could not sign you in. Please try again. If the problem continues, contact IT.';
}

export default function LoginForm() {
  const [mode, setMode] =
    useState<
      'login' | 'register'
    >('login');

  const [
    username,
    setUsername,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    busy,
    setBusy,
  ] = useState(false);

  // ----------------------------------
  // SIGN IN
  // ----------------------------------

  async function login() {
    const normalized =
      normalizeUsername(
        username
      );

    if (
      !isValidUsername(
        normalized
      )
    ) {
      throw new Error(
        'Enter a valid username using 3–20 letters, numbers, underscores or hyphens.'
      );
    }

    if (!password) {
      throw new Error(
        'Enter your password.'
      );
    }

    const supabase =
      createClient();

    const email =
      usernameToAuthEmail(
        normalized
      );

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

    if (error) {
      throw error;
    }

    const user =
      data.user;

    if (!user) {
      throw new Error(
        'Unable to load your account.'
      );
    }

    // ----------------------------------
    // CHECK FOR TEMPORARY PASSWORD
    // ----------------------------------

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(`
        must_change_password
      `)
      .eq(
        'id',
        user.id
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        '[LOGIN] Unable to check password status:',
        profileError
      );
    }

    // If an administrator issued
    // a temporary password, force
    // the player to replace it.
    if (
      profile
        ?.must_change_password
    ) {
      window.location.assign(
        '/change-password'
      );

      return;
    }

    window.location.assign(
      '/dashboard'
    );
  }

  // ----------------------------------
  // REGISTER
  // ----------------------------------

  async function register() {
    const normalized =
      normalizeUsername(
        username
      );

    if (
      !isValidUsername(
        normalized
      )
    ) {
      throw new Error(
        'Username must be 3–20 characters and use only letters, numbers, underscores or hyphens.'
      );
    }

    if (
      !validatePassword(
        password
      )
    ) {
      throw new Error(
        'Password must be 8–72 characters and include at least one letter and one number.'
      );
    }

    if (
      password !==
      confirmPassword
    ) {
      throw new Error(
        'Passwords do not match.'
      );
    }

    const response =
      await fetch(
        '/api/auth/register',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              username:
                normalized,

              password,
            }),
        }
      );

    const rawBody =
      await response.text();

    let body: {
      message?: string;
      code?: string;
    } = {};

    try {
      body =
        rawBody
          ? JSON.parse(
              rawBody
            )
          : {};
    } catch {
      // If the API returns HTML,
      // the fallback message below
      // will be used.
    }

    if (!response.ok) {
      const apiDetail =
        body.code
          ? `${
              body.message ??
              'Registration failed.'
            } (${body.code})`
          : body.message;

      const fallback =
        rawBody &&
        !rawBody
          .trim()
          .startsWith('<')
          ? rawBody.slice(
              0,
              300
            )
          : `Registration API returned HTTP ${response.status}.`;

      throw new Error(
        apiDetail ||
          fallback
      );
    }

    const supabase =
      createClient();

    const email =
      usernameToAuthEmail(
        normalized
      );

    const {
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

    if (error) {
      throw error;
    }

    window.location.assign(
      '/dashboard'
    );
  }

  // ----------------------------------
  // SUBMIT
  // ----------------------------------

  async function submit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      if (
        mode === 'login'
      ) {
        await login();
      } else {
        await register();
      }
    } catch (err) {
      const raw =
        err instanceof Error
          ? err.message
          : 'Unknown authentication error';

      setMessage(
        mode === 'login'
          ? friendlyAuthError(
              raw
            )
          : raw
      );
    } finally {
      setBusy(false);
    }
  }

  // ----------------------------------
  // SWITCH LOGIN / REGISTER
  // ----------------------------------

  function switchMode(
    next:
      | 'login'
      | 'register'
  ) {
    setMode(next);

    setPassword('');

    setConfirmPassword('');

    setMessage('');
  }

  return (
    <section className="card p-5">
      {/* AUTH MODE */}

      <div
        className="mb-5 grid grid-cols-2 gap-2"
        aria-label="Authentication mode"
      >
        <button
          type="button"
          className={`btn ${
            mode === 'login'
              ? 'btn-primary'
              : 'btn-secondary'
          }`}
          onClick={() =>
            switchMode(
              'login'
            )
          }
        >
          Sign in
        </button>

        <button
          type="button"
          className={`btn ${
            mode ===
            'register'
              ? 'btn-primary'
              : 'btn-secondary'
          }`}
          onClick={() =>
            switchMode(
              'register'
            )
          }
        >
          Create account
        </button>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4"
      >
        {/* USERNAME */}

        <div>
          <label
            htmlFor="username"
            className="mb-2 block text-sm font-bold"
          >
            Username
          </label>

          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={3}
            maxLength={20}
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
            placeholder="cyberhawk26"
          />

          {mode ===
            'register' && (
            <p className="muted mt-2 text-xs">
              3–20 characters.
              Letters, numbers,
              underscores and
              hyphens only. Your
              username stays
              private.
            </p>
          )}
        </div>

        {/* PASSWORD */}

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-sm font-bold"
            >
              Password
            </label>

            {mode ===
              'login' && (
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-[var(--accent)] hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === 'login'
                ? 'current-password'
                : 'new-password'
            }
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
            placeholder={
              mode === 'login'
                ? 'Enter your password'
                : 'Create a secure password'
            }
          />
        </div>

        {/* CONFIRM PASSWORD */}

        {mode ===
          'register' && (
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-bold"
            >
              Confirm password
            </label>

            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={
                confirmPassword
              }
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
              placeholder="Re-enter your password"
            />
          </div>
        )}

        {/* SUBMIT */}

        <button
          disabled={busy}
          className="btn btn-primary w-full disabled:opacity-60"
          type="submit"
        >
          {busy
            ? mode ===
              'login'
              ? 'Signing in…'
              : 'Creating account…'
            : mode ===
                'login'
              ? 'Enter Cyber Defence Unit'
              : 'Create account'}
        </button>

        {/* STATUS */}

        {message && (
          <p
            role="status"
            aria-live="polite"
            className="muted text-sm"
          >
            {message}
          </p>
        )}
      </form>
    </section>
  );
}