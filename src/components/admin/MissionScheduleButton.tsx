'use client';

import { useState } from 'react';

type Props = {
  missionId: number;
  missionTitle: string;
  unlockAt: string | null;
};

function jamaicaParts(value: string | null) {
  if (!value) {
    return {
      date: '',
      time: '',
    };
  }

  const date = new Date(value);

  const parts = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'America/Jamaica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
  ).formatToParts(date);

  const get = (type: string) =>
    parts.find(
      (part) => part.type === type
    )?.value ?? '';

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

function formatSchedule(
  value: string | null
) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat(
    'en-JM',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Jamaica',
    }
  ).format(new Date(value));
}

export default function MissionScheduleButton({
  missionId,
  missionTitle,
  unlockAt,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const [currentUnlockAt, setCurrentUnlockAt] =
    useState<string | null>(unlockAt);

  const initial =
    jamaicaParts(currentUnlockAt);

  const [date, setDate] =
    useState(initial.date);

  const [time, setTime] =
    useState(initial.time);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  function openModal() {
    const current =
      jamaicaParts(currentUnlockAt);

    setDate(current.date);
    setTime(current.time);
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setError(null);
    setOpen(false);
  }

  async function saveSchedule() {
    if (!date || !time) {
      setError(
        'Select both a date and time.'
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        '/api/admin/missions/schedule',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            missionId,
            date,
            time,
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

      if (data?.mission?.unlock_at) {
        setCurrentUnlockAt(
          data.mission.unlock_at
        );
      }

      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update schedule.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-[var(--line)] bg-[#07141d] p-4">
        <p className="text-xs font-bold tracking-[0.14em] text-cyan-300">
          SCHEDULED RELEASE
        </p>

        <p className="mt-2 font-bold">
          {formatSchedule(
            currentUnlockAt
          )}
        </p>

        <p className="muted mt-1 text-xs">
          Jamaica time
        </p>

        <button
          type="button"
          onClick={openModal}
          className="btn btn-secondary mt-4"
        >
          Change Schedule
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-cyan-950 bg-[#061019] shadow-2xl">
            <header className="flex items-start justify-between border-b border-[var(--line)] px-6 py-5">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-cyan-300">
                  MISSION SCHEDULE
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {missionTitle}
                </h2>

                <p className="muted mt-1 text-sm">
                  Mission{' '}
                  {String(
                    missionId
                  ).padStart(2, '0')}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-[var(--line)] px-3 py-2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </header>

            <div className="p-6">
              <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
                <p className="font-bold text-amber-300">
                  Jamaica Time
                </p>

                <p className="muted mt-1 text-sm">
                  Saving a new date and time
                  will return this mission to
                  scheduled mode.
                </p>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-bold">
                    Release Date
                  </span>

                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[#02080d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>

                <label>
                  <span className="text-sm font-bold">
                    Release Time
                  </span>

                  <input
                    type="time"
                    value={time}
                    onChange={(event) =>
                      setTime(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[#02080d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>
              </div>

              {date && time && (
                <div className="mt-5 rounded-xl border border-cyan-950 bg-[#02080d] p-4">
                  <p className="text-xs font-bold tracking-[0.14em] text-cyan-300">
                    NEW RELEASE
                  </p>

                  <p className="mt-2 font-black">
                    {new Intl.DateTimeFormat(
                      'en-JM',
                      {
                        dateStyle: 'full',
                        timeStyle: 'short',
                        timeZone:
                          'America/Jamaica',
                      }
                    ).format(
                      new Date(
                        `${date}T${time}:00-05:00`
                      )
                    )}
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm font-bold text-red-300">
                  {error}
                </div>
              )}

              <div className="mt-7 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveSchedule}
                  disabled={
                    saving ||
                    !date ||
                    !time
                  }
                  className="btn btn-primary"
                >
                  {saving
                    ? 'Saving...'
                    : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}