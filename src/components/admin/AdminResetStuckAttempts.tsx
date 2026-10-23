'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Only ever targets attempts stuck at status='active',
// current_stage='briefing' -- see /api/admin/missions/reset-stuck.
// Never touches a player who has made any real progress or already
// has a score, so there is no accidental loss of a real result.
export default function AdminResetStuckAttempts({
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
        `/api/admin/missions/reset-stuck?missionId=${missionId}`,
        { cache: 'no-store' }
      );

      const countData = await countResponse.json().catch(() => ({}));

      if (!countResponse.ok) {
        throw new Error(
          countData.error || 'Unable to check for stuck attempts.'
        );
      }

      const count = countData.count ?? 0;

      if (count === 0) {
        alert(
          `No players are currently stuck at the briefing screen for ${missionTitle}.`
        );
        return;
      }

      const confirmed = confirm(
        `Reset ${count} player${count === 1 ? '' : 's'} stuck at the briefing screen for ${missionTitle}?\n\n` +
          `This permanently deletes their attempt and progress for this mission so they can start over. ` +
          `This only affects players who have made zero real progress -- it cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      const resetResponse = await fetch('/api/admin/missions/reset-stuck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId }),
      });

      const resetData = await resetResponse.json().catch(() => ({}));

      if (!resetResponse.ok) {
        throw new Error(resetData.error || 'Unable to reset stuck attempts.');
      }

      alert(
        `Reset ${resetData.resetCount} player${resetData.resetCount === 1 ? '' : 's'} for ${missionTitle}.`
      );

      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Unable to reset stuck attempts.'
      );
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
      {busy ? 'Checking...' : 'Reset Stuck Attempts'}
    </button>
  );
}
