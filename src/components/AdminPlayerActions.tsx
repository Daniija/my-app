'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Action =
  | 'activate'
  | 'deactivate'
  | 'make_admin'
  | 'make_player'
  | 'delete';

export default function AdminPlayerActions({
  playerId,
  active,
  role,
}: {
  playerId: string;
  active: boolean;
  role: string;
}) {
  const [busyAction, setBusyAction] =
    useState<Action | null>(null);

  const router = useRouter();

  async function run(action: Action) {
    const labels: Record<Action, string> = {
      activate: 'activate this account',
      deactivate: 'deactivate this account',
      make_admin: 'promote this player to admin',
      make_player: 'remove admin privileges from this account',
      delete: 'permanently delete this player and their mission data',
    };

    const warning =
      action === 'delete'
        ? '\n\nThis cannot be undone.'
        : '';

    if (
      !confirm(
        `Are you sure you want to ${labels[action]}?${warning}`
      )
    ) {
      return;
    }

    setBusyAction(action);

    try {
      const response = await fetch(
        '/api/admin/players',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playerId,
            action,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Request failed (${response.status}).`
        );
      }

      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to update player.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  const busy = busyAction !== null;

  return (
    <div className="flex flex-wrap gap-2">
      {active ? (
        <button
          className="btn btn-danger"
          disabled={busy}
          type="button"
          onClick={() => run('deactivate')}
        >
          {busyAction === 'deactivate'
            ? 'Deactivating...'
            : 'Deactivate'}
        </button>
      ) : (
        <button
          className="btn btn-secondary"
          disabled={busy}
          type="button"
          onClick={() => run('activate')}
        >
          {busyAction === 'activate'
            ? 'Activating...'
            : 'Activate'}
        </button>
      )}

      {role === 'admin' ? (
        <button
          className="btn btn-secondary"
          disabled={busy}
          type="button"
          onClick={() => run('make_player')}
        >
          {busyAction === 'make_player'
            ? 'Updating...'
            : 'Make player'}
        </button>
      ) : (
        <>
          <button
            className="btn btn-secondary"
            disabled={busy}
            type="button"
            onClick={() => run('make_admin')}
          >
            {busyAction === 'make_admin'
              ? 'Updating...'
              : 'Make admin'}
          </button>

          <button
            className="btn btn-danger"
            disabled={busy}
            type="button"
            onClick={() => run('delete')}
          >
            {busyAction === 'delete'
              ? 'Deleting...'
              : 'Delete Player'}
          </button>
        </>
      )}
    </div>
  );
}
