'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Action =
  | 'activate'
  | 'deactivate'
  | 'make_admin'
  | 'make_player'
  | 'delete'
  | 'reset_password'
  | 'reset_mission_1'
  | 'reset_mission_2'
  | 'reset_mission_3'
  | 'reset_mission_4'
  | 'make_tester'
  | 'remove_tester';

const RESET_MISSION_ACTIONS = [
  'reset_mission_1',
  'reset_mission_2',
  'reset_mission_3',
  'reset_mission_4',
] as const;

type ResetMissionAction = (typeof RESET_MISSION_ACTIONS)[number];

type ConfirmRequest = {
  action: Action;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
};

type PasswordResult = {
  alias: string;
  username: string;
  temporaryPassword: string;
};

function Overlay({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div className="card w-full max-w-md p-6 shadow-xl">{children}</div>
    </div>
  );
}

export default function AdminPlayerActions({
  playerId,
  active,
  role,
  isTester,
  alias,
  username,
}: {
  playerId: string;
  active: boolean;
  role: string;
  isTester?: boolean;
  alias?: string | null;
  username?: string | null;
}) {
  const [busyAction, setBusyAction] = useState<Action | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(
    null
  );
  const [passwordResult, setPasswordResult] =
    useState<PasswordResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const router = useRouter();

  const playerName = alias || username || 'this player';
  const busy = busyAction !== null;

  // ==================================
  // RESET PASSWORD
  // ==================================

  async function performResetPassword() {
    setBusyAction('reset_password');

    try {
      const response = await fetch('/api/admin/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_one', playerId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            `Password reset failed (${response.status}).`
        );
      }

      setPasswordResult({
        alias: data.alias || playerName,
        username: data.username || username || '—',
        temporaryPassword: data.temporaryPassword,
      });

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to reset password.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  // ==================================
  // RESET MISSION (any of 1-4 -- testers in particular need to
  // replay any mission repeatedly while it's being validated before
  // launch, not just Mission 3)
  // ==================================

  async function performResetMission(action: ResetMissionAction) {
    const missionId = Number(action.slice('reset_mission_'.length));

    setBusyAction(action);

    try {
      const response = await fetch('/api/admin/players/reset-mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, missionId }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `Reset failed (${response.status}).`
        );
      }

      if (data.reset) {
        router.refresh();
      } else if (data.reason === 'already_completed') {
        setErrorMessage(
          `${playerName} has already completed Mission ${missionId} with a real score, so nothing was reset.`
        );
      } else if (data.reason === 'no_attempt') {
        setErrorMessage(
          `${playerName} doesn't have a Mission ${missionId} attempt to reset.`
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `Unable to reset Mission ${missionId}.`
      );
    } finally {
      setBusyAction(null);
    }
  }

  // ==================================
  // ACTIVATE / DEACTIVATE / ROLE / DELETE
  // ==================================

  async function performAction(
    action: Exclude<Action, 'reset_password' | ResetMissionAction>
  ) {
    setBusyAction(action);

    try {
      const response = await fetch('/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `Request failed (${response.status}).`
        );
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update player.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  // ==================================
  // DIALOG TRIGGERS
  // ==================================

  function requestResetPassword() {
    if (role !== 'player') {
      setErrorMessage(
        'Administrator passwords cannot be reset from this screen.'
      );
      return;
    }

    setConfirmRequest({
      action: 'reset_password',
      title: 'Reset password?',
      description: `Reset the password for ${playerName}? Their current password will stop working immediately, and they will be given a new temporary one.`,
      confirmLabel: 'Reset password',
    });
  }

  function requestAction(
    action: Exclude<Action, 'reset_password'>,
    title: string,
    description: string,
    confirmLabel: string,
    danger?: boolean
  ) {
    setConfirmRequest({ action, title, description, confirmLabel, danger });
  }

  function requestResetMission(missionId: number) {
    const action = `reset_mission_${missionId}` as ResetMissionAction;

    requestAction(
      action,
      `Reset Mission ${missionId} attempt?`,
      `Reset ${playerName}'s Mission ${missionId} attempt and progress so they can start over? This never touches a real completed score.`,
      `Reset Mission ${missionId}`,
      true
    );
  }

  function isResetMissionAction(action: Action): action is ResetMissionAction {
    return (RESET_MISSION_ACTIONS as readonly string[]).includes(action);
  }

  function handleConfirm() {
    if (!confirmRequest) return;

    const { action } = confirmRequest;
    setConfirmRequest(null);

    if (isResetMissionAction(action)) {
      performResetMission(action);
      return;
    }

    if (action === 'reset_password') {
      performResetPassword();
    } else {
      performAction(action);
    }
  }

  function requestSetTester(nextIsTester: boolean) {
    requestAction(
      nextIsTester ? 'make_tester' : 'remove_tester',
      nextIsTester ? 'Mark as mission tester?' : 'Remove tester status?',
      nextIsTester
        ? `${playerName} will be able to play any mission's real flow before it unlocks publicly, and their scores will never appear on the real leaderboard.`
        : `${playerName} will go back to being a normal player. If they already have real mission scores, their leaderboard entry will be restored.`,
      nextIsTester ? 'Mark as tester' : 'Remove tester'
    );
  }

  async function copyPassword() {
    if (!passwordResult) return;

    try {
      await navigator.clipboard.writeText(passwordResult.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (e.g. insecure context); the
      // password is still visible on screen to copy manually.
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* RESET PASSWORD */}

      {role === 'player' && (
        <button
          type="button"
          disabled={busy}
          onClick={requestResetPassword}
          className="btn btn-secondary"
        >
          {busyAction === 'reset_password'
            ? 'Resetting...'
            : 'Reset Password'}
        </button>
      )}

      {/* RESET MISSION (1-4) */}

      {role === 'player' &&
        RESET_MISSION_ACTIONS.map((action, index) => {
          const missionId = index + 1;

          return (
            <button
              key={action}
              type="button"
              disabled={busy}
              onClick={() => requestResetMission(missionId)}
              className="btn btn-danger"
            >
              {busyAction === action
                ? 'Resetting...'
                : `Reset Mission ${missionId}`}
            </button>
          );
        })}

      {/* TESTER STATUS */}

      {role === 'player' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => requestSetTester(!isTester)}
          className="btn btn-secondary"
        >
          {busyAction === 'make_tester' || busyAction === 'remove_tester'
            ? 'Updating...'
            : isTester
              ? 'Remove Tester'
              : 'Mark as Tester'}
        </button>
      )}

      {/* ACTIVATE / DEACTIVATE */}

      {active ? (
        <button
          className="btn btn-danger"
          disabled={busy}
          type="button"
          onClick={() =>
            requestAction(
              'deactivate',
              'Deactivate this account?',
              `${playerName} will be immediately signed out and blocked from signing in again until reactivated.`,
              'Deactivate',
              true
            )
          }
        >
          {busyAction === 'deactivate' ? 'Deactivating...' : 'Deactivate'}
        </button>
      ) : (
        <button
          className="btn btn-secondary"
          disabled={busy}
          type="button"
          onClick={() =>
            requestAction(
              'activate',
              'Activate this account?',
              `${playerName} will be able to sign in again.`,
              'Activate'
            )
          }
        >
          {busyAction === 'activate' ? 'Activating...' : 'Activate'}
        </button>
      )}

      {/* ROLE MANAGEMENT */}

      {role === 'admin' ? (
        <button
          className="btn btn-secondary"
          disabled={busy}
          type="button"
          onClick={() =>
            requestAction(
              'make_player',
              'Remove admin privileges?',
              `${playerName} will be downgraded to a regular player account.`,
              'Make player'
            )
          }
        >
          {busyAction === 'make_player' ? 'Updating...' : 'Make player'}
        </button>
      ) : (
        <>
          <button
            className="btn btn-secondary"
            disabled={busy}
            type="button"
            onClick={() =>
              requestAction(
                'make_admin',
                'Promote to admin?',
                `${playerName} will be granted full administrator access to this contest.`,
                'Make admin'
              )
            }
          >
            {busyAction === 'make_admin' ? 'Updating...' : 'Make admin'}
          </button>

          <button
            className="btn btn-danger"
            disabled={busy}
            type="button"
            onClick={() =>
              requestAction(
                'delete',
                'Delete this player?',
                `This permanently removes ${playerName} and all of their mission data. This cannot be undone.`,
                'Delete player',
                true
              )
            }
          >
            {busyAction === 'delete' ? 'Deleting...' : 'Delete Player'}
          </button>
        </>
      )}

      {/* CONFIRMATION DIALOG */}

      {confirmRequest && (
        <Overlay onDismiss={() => setConfirmRequest(null)}>
          <h2 className="text-lg font-black">{confirmRequest.title}</h2>

          <p className="muted mt-3 text-sm">{confirmRequest.description}</p>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              autoFocus
              onClick={() => setConfirmRequest(null)}
            >
              Cancel
            </button>

            <button
              type="button"
              className={`btn ${
                confirmRequest.danger ? 'btn-danger' : 'btn-primary'
              }`}
              onClick={handleConfirm}
            >
              {confirmRequest.confirmLabel}
            </button>
          </div>
        </Overlay>
      )}

      {/* PASSWORD RESET RESULT */}

      {passwordResult && (
        <Overlay
          onDismiss={() => {
            setPasswordResult(null);
            setCopied(false);
          }}
        >
          <h2 className="text-lg font-black">Password reset successful</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="muted">Player</dt>
              <dd className="font-bold">{passwordResult.alias}</dd>
            </div>

            <div className="flex justify-between gap-3">
              <dt className="muted">Username</dt>
              <dd className="font-bold">{passwordResult.username}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="muted text-xs font-bold uppercase">
              Temporary password
            </p>

            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[#07141d] p-3">
              <code className="select-all text-base font-bold tracking-wide">
                {passwordResult.temporaryPassword}
              </code>

              <button
                type="button"
                className="btn btn-secondary shrink-0"
                onClick={copyPassword}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <p className="muted mt-4 text-xs">
            Give this password only to the player. They will be required to
            create a new password after signing in.
          </p>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              autoFocus
              onClick={() => {
                setPasswordResult(null);
                setCopied(false);
              }}
            >
              Done
            </button>
          </div>
        </Overlay>
      )}

      {/* ERROR DIALOG */}

      {errorMessage && (
        <Overlay onDismiss={() => setErrorMessage(null)}>
          <h2 className="text-lg font-black">Something went wrong</h2>

          <p className="muted mt-3 text-sm">{errorMessage}</p>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              autoFocus
              onClick={() => setErrorMessage(null)}
            >
              Close
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
