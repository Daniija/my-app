'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Broader than AdminResetStuckAttempts: resets EVERY in-progress
// attempt for a mission, regardless of stage. Never touches a player
// who already has a finalized score (mission_scores row) for this
// mission -- see /api/admin/missions/reset-all for the exact rule.
export default function AdminResetAllAttempts({
  missionId,
  missionTitle,
}: {
  missionId: number;
  missionTitle: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleReset() {
    setBusy(true);

    try {
      const countResponse = await fetch(
        `/api/admin/missions/reset-all?missionId=${missionId}`,
        { cache: 'no-store' }
      );

      const countData = await countResponse.json().catch(() => ({}));

      if (!countResponse.ok) {
        throw new Error(
          countData.error || 'Unable to check for in-progress attempts.'
        );
      }

      const count = countData.count ?? 0;

      if (count === 0) {
        alert(`No in-progress attempts found for ${missionTitle}.`);
        return;
      }

      const confirmed = confirm(
        `Reset ALL ${count} in-progress attempt${count === 1 ? '' : 's'} for ${missionTitle}?\n\n` +
          `This permanently deletes every player's attempt and progress for this mission, ` +
          `no matter how far they got -- except any player who has already fully completed ` +
          `it with a real recorded score, who will NOT be touched.\n\n` +
          `This cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      const resetResponse = await fetch('/api/admin/missions/reset-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId }),
      });

      const resetData = await resetResponse.json().catch(() => ({}));

      if (!resetResponse.ok) {
        throw new Error(resetData.error || 'Unable to reset attempts.');
      }

      alert(
        `Reset ${resetData.resetCount} player${resetData.resetCount === 1 ? '' : 's'} for ${missionTitle}.`
      );

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to reset attempts.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleReset}
      className="btn btn-danger"
    >
      {busy ? 'Checking...' : 'Reset All Attempts'}
    </button>
  );
}
