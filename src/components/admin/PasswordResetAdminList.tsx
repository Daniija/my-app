'use client';

import { useState } from 'react';

type ResetRequest = {
  id: string;
  player_id: string;
  requested_at: string;

  profiles:
    | {
        username:
          string | null;
        alias:
          string | null;
        is_active:
          boolean;
      }
    | {
        username:
          string | null;
        alias:
          string | null;
        is_active:
          boolean;
      }[]
    | null;
};

function getProfile(
  row: ResetRequest
) {
  if (
    Array.isArray(
      row.profiles
    )
  ) {
    return (
      row.profiles[0] ??
      null
    );
  }

  return row.profiles;
}

export default function PasswordResetAdminList({
  initialRequests,
}: {
  initialRequests:
    ResetRequest[];
}) {
  const [
    requests,
    setRequests,
  ] =
    useState(
      initialRequests
    );

  const [
    passwords,
    setPasswords,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  const [
    busyId,
    setBusyId,
  ] =
    useState<
      string | null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState('');

  async function resetPassword(
    request:
      ResetRequest
  ) {
    const temporaryPassword =
      passwords[
        request.id
      ] ?? '';

    if (
      temporaryPassword.length <
        8 ||
      !/[A-Za-z]/.test(
        temporaryPassword
      ) ||
      !/[0-9]/.test(
        temporaryPassword
      )
    ) {
      setMessage(
        'Temporary password must be at least 8 characters and contain at least one letter and one number.'
      );

      return;
    }

    setBusyId(
      request.id
    );

    setMessage('');

    try {
      const response =
        await fetch(
          '/api/admin/password-resets/resolve',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                requestId:
                  request.id,

                temporaryPassword,
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
            'Unable to reset password.'
        );
      }

      const profile =
        getProfile(
          request
        );

      setRequests(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              request.id
          )
      );

      setMessage(
        `Temporary password successfully set for ${
          profile?.alias ??
          profile?.username ??
          'the player'
        }. Give the temporary password to the player securely.`
      );
    } catch (error) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to reset password.'
      );
    } finally {
      setBusyId(null);
    }
  }

  if (
    requests.length ===
    0
  ) {
    return (
      <div className="card p-6 text-center">
        <p className="font-bold">
          No pending password
          reset requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="card p-4 text-sm">
          {message}
        </div>
      )}

      {requests.map(
        (request) => {
          const profile =
            getProfile(
              request
            );

          return (
            <article
              key={
                request.id
              }
              className="card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-black">
                    {profile
                      ?.alias ??
                      'Player'}
                  </p>

                  <p className="muted mt-1 text-sm">
                    @
                    {profile
                      ?.username ??
                      'unknown'}
                  </p>

                  <p className="muted mt-2 text-xs">
                    Requested{' '}
                    {new Date(
                      request.requested_at
                    ).toLocaleString()}
                  </p>
                </div>

                <span className="badge">
                  PENDING
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="password"
                  value={
                    passwords[
                      request.id
                    ] ?? ''
                  }
                  onChange={(
                    event
                  ) =>
                    setPasswords(
                      (
                        current
                      ) => ({
                        ...current,

                        [request.id]:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  className="w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"
                  placeholder="Enter temporary password"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={
                    busyId ===
                      request.id ||
                    !profile
                      ?.is_active
                  }
                  onClick={() =>
                    void resetPassword(
                      request
                    )
                  }
                >
                  {busyId ===
                  request.id
                    ? 'Resetting…'
                    : 'Set Temporary Password'}
                </button>
              </div>
            </article>
          );
        }
      )}
    </div>
  );
}