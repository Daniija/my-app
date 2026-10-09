'use client';

import {
  useEffect,
  useState,
} from 'react';

type Props = {
  status: string;
  unlockAt: string | null;
};

function getEffectiveStatus(
  status: string,
  unlockAt: string | null
) {
  if (
    status === 'forced_open' ||
    status === 'open'
  ) {
    return 'OPEN';
  }

  if (
    status === 'emergency_locked'
  ) {
    return 'EMERGENCY LOCKED';
  }

  if (status === 'closed') {
    return 'CLOSED';
  }

  if (
    status === 'scheduled' &&
    unlockAt
  ) {
    const unlockTime =
      new Date(unlockAt).getTime();

    if (
      !Number.isNaN(unlockTime) &&
      Date.now() >= unlockTime
    ) {
      return 'OPEN';
    }
  }

  if (status === 'scheduled') {
    return 'SCHEDULED';
  }

  return status
    .replaceAll('_', ' ')
    .toUpperCase();
}

export default function MissionStatusBadge({
  status,
  unlockAt,
}: Props) {
  const [
    effectiveStatus,
    setEffectiveStatus,
  ] = useState(() =>
    getEffectiveStatus(
      status,
      unlockAt
    )
  );

  useEffect(() => {
    function updateStatus() {
      setEffectiveStatus(
        getEffectiveStatus(
          status,
          unlockAt
        )
      );
    }

    updateStatus();

    const timer =
      window.setInterval(
        updateStatus,
        10000
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [status, unlockAt]);

  return (
    <span className="badge">
      {effectiveStatus}
    </span>
  );
}