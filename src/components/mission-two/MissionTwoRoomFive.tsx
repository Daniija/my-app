'use client';

import { FormEvent, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import MissionTwoLesson from '@/components/mission-two/MissionTwoLesson';

type Props = {
  playerAlias: string;

  previewMode?: boolean;
};

type FieldName =
  | 'fileName'
  | 'fileType'
  | 'creationDate'
  | 'creationTime'
  | 'deviceModel'
  | 'software'
  | 'gpsLatitude'
  | 'gpsLongitude'
  | 'imageWidth'
  | 'imageHeight'
  | 'exposureTime'
  | 'orientation';

type WorksheetAnswers = Record<FieldName, string>;

type FieldResults = Partial<Record<FieldName, boolean>>;

type SubmitResponse = {
  ok?: boolean;

  correct?: boolean;

  preview?: boolean;

  score?: number;

  clue?: string | null;

  message?: string;

  nextStage?: string;

  verifiedCount?: number;

  totalFields?: number;

  fieldResults?: FieldResults;
};

const EMPTY_ANSWERS: WorksheetAnswers = {
  fileName: '',

  fileType: '',

  creationDate: '',

  creationTime: '',

  deviceModel: '',

  software: '',

  gpsLatitude: '',

  gpsLongitude: '',

  imageWidth: '',

  imageHeight: '',

  exposureTime: '',

  orientation: '',
};

const FIELD_GROUPS = [
  {
    title: 'FILE IDENTIFICATION',

    fields: [
      {
        name: 'fileName' as const,

        label: 'File name',

        placeholder: 'Enter file name',
      },

      {
        name: 'fileType' as const,

        label: 'File type',

        placeholder: 'Enter file type',
      },
    ],
  },

  {
    title: 'TIMELINE',

    fields: [
      {
        name: 'creationDate' as const,

        label: 'Original creation date',

        placeholder: 'Enter creation date',
      },

      {
        name: 'creationTime' as const,

        label: 'Original creation time',

        placeholder: 'Enter creation time',
      },
    ],
  },

  {
    title: 'CAPTURE DEVICE',

    fields: [
      {
        name: 'deviceModel' as const,

        label: 'Device model',

        placeholder: 'Enter device model',
      },

      {
        name: 'software' as const,

        label: 'Operating system / software',

        placeholder: 'Enter software version',
      },
    ],
  },

  {
    title: 'LOCATION',

    fields: [
      {
        name: 'gpsLatitude' as const,

        label: 'GPS latitude',

        placeholder: 'Enter latitude',
      },

      {
        name: 'gpsLongitude' as const,

        label: 'GPS longitude',

        placeholder: 'Enter longitude',
      },
    ],
  },

  {
    title: 'IMAGE PROPERTIES',

    fields: [
      {
        name: 'imageWidth' as const,

        label: 'Image width',

        placeholder: 'Enter width',
      },

      {
        name: 'imageHeight' as const,

        label: 'Image height',

        placeholder: 'Enter height',
      },
    ],
  },

  {
    title: 'CAMERA SETTINGS',

    fields: [
      {
        name: 'exposureTime' as const,

        label: 'Exposure time',

        placeholder: 'Enter exposure time',
      },

      {
        name: 'orientation' as const,

        label: 'Orientation',

        placeholder: 'Enter orientation',
      },
    ],
  },
];

export default function MissionTwoRoomFive({
  playerAlias,

  previewMode = false,
}: Props) {
  const router = useRouter();

  const [answers, setAnswers] = useState<WorksheetAnswers>(EMPTY_ANSWERS);

  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(
    null,
  );

  const [extractionStarted, setExtractionStarted] = useState(false);

  const [loadingMetadata, setLoadingMetadata] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [fieldResults, setFieldResults] = useState<FieldResults>({});

  const [verifiedCount, setVerifiedCount] = useState(0);

  const [totalFields, setTotalFields] = useState(12);

  const [message, setMessage] = useState('');

  const [success, setSuccess] = useState(false);

  const [recoveredClue, setRecoveredClue] = useState<string | null>(null);

  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    setAnswers(EMPTY_ANSWERS);
  }, []);

  async function extractMetadata() {
    setLoadingMetadata(true);

    setMessage('');

    try {
      const response = await fetch(
        '/mission-two/room-5/metadata.json',

        {
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        throw new Error('Metadata extraction failed.');
      }

      const data = await response.json();

      setMetadata(data);

      setExtractionStarted(true);
    } catch (error) {
      console.error(
        '[MISSION 02 ROOM 05] Metadata load failed:',

        error,
      );

      setMessage('Unable to load the extracted metadata. Please try again.');
    } finally {
      setLoadingMetadata(false);
    }
  }

  function updateAnswer(
    field: FieldName,

    value: string,
  ) {
    setAnswers((current) => ({
      ...current,

      [field]: value,
    }));

    setFieldResults((current) => {
      const next = {
        ...current,
      };

      delete next[field];

      return next;
    });

    setMessage('');
  }

  function fieldStatus(field: FieldName) {
    if (fieldResults[field] === true) {
      return 'verified';
    }

    if (fieldResults[field] === false) {
      return 'incorrect';
    }

    return 'pending';
  }

  async function submitWorksheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || success) {
      return;
    }

    setSubmitting(true);

    setMessage('');

    try {
      const response = await fetch(
        '/api/missions/2/room-5/submit',

        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            worksheet: answers,

            previewMode,
          }),
        },
      );

      const data: SubmitResponse = await response.json();

      if (!response.ok) {
        setMessage(data.message ?? 'Unable to verify the forensic report.');

        return;
      }

      setFieldResults(data.fieldResults ?? {});

      setVerifiedCount(data.verifiedCount ?? 0);

      setTotalFields(data.totalFields ?? 12);

      setMessage(data.message ?? '');

      if (data.correct) {
        setSuccess(true);

        setRecoveredClue(data.clue ?? null);

        setScore(typeof data.score === 'number' ? data.score : null);
      }
    } catch (error) {
      console.error(
        '[MISSION 02 ROOM 05] Submit failed:',

        error,
      );

      setMessage('Unable to verify the forensic report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function continueMission() {
    if (previewMode) {
      router.push('/admin/missions/2/preview/room-6');

      return;
    }

    router.push('/missions/2/play/room-6');
  }

  const commandCentreHref = previewMode
    ? '/admin/missions/2/preview/escape-room?stage=room-5'
    : '/missions/2/play/escape-room';

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {previewMode && (
          <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="text-xs font-black tracking-[0.18em] text-amber-300">
              ADMIN PREVIEW
            </p>

            <p className="mt-1 text-sm text-[var(--muted)]">
              This room can be tested without changing player progress, scores,
              or leaderboard data.
            </p>
          </div>
        )}

        <div className="mb-8 flex flex-col gap-5 border-b border-[var(--line)] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
              MISSION 02 // ROOM 05
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Hidden Information
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Agent{' '}
              <span className="font-bold text-[var(--text)]">
                {playerAlias}
              </span>
              , the photograph appears harmless. Your job is to investigate the
              data hidden behind the image and complete the forensic report.
            </p>
          </div>

          <a
            href={commandCentreHref}

            className="btn btn-secondary"
          >
            Command Centre
          </a>
        </div>

        <section className="mb-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-cyan-300">
                FORENSIC BRIEFING
              </p>

              <h2 className="mt-2 text-xl font-black">
                Recover the hidden evidence
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Inspect the raw metadata extraction and identify all twelve
                requested values. Some fields are intentionally similar, so read
                the metadata carefully.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-black/20 px-5 py-4">
              <p className="text-xs font-bold tracking-[0.14em] text-[var(--muted)]">
                REPORT STATUS
              </p>

              <p className="mt-1 text-2xl font-black">
                {verifiedCount}

                {' / '}

                {totalFields}
              </p>

              <p className="text-xs text-[var(--muted)]">fields verified</p>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
              <div className="border-b border-[var(--line)] p-5 sm:p-6">
                <p className="text-xs font-black tracking-[0.18em] text-cyan-300">
                  EVIDENCE // IMG_4821.JPG
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Raw Metadata Extraction
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Run the extraction process and search the resulting JSON for
                  the information requested in the forensic worksheet.
                </p>
              </div>

              {!extractionStarted ? (
                <div className="p-5 sm:p-6">
                  <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-2xl">
                      ⌕
                    </div>

                    <h3 className="mt-5 text-lg font-black">
                      Metadata awaiting extraction
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                      The visible image does not reveal the whole story. Inspect
                      the information stored in the file itself.
                    </p>

                    <button
                      type="button"

                      onClick={extractMetadata}

                      disabled={loadingMetadata}

                      className="btn btn-primary mt-6"
                    >
                      {loadingMetadata
                        ? 'Extracting...'
                        : 'Run Metadata Extraction'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black tracking-[0.15em] text-emerald-300">
                        EXTRACTION COMPLETE
                      </p>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Search through the raw output below.
                      </p>
                    </div>

                    <button
                      type="button"

                      onClick={extractMetadata}

                      disabled={loadingMetadata}

                      className="btn btn-secondary"
                    >
                      Re-run Extraction
                    </button>
                  </div>

                  <div className="max-h-[760px] overflow-auto rounded-xl border border-[var(--line)] bg-black/70 p-4">
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-emerald-300 sm:text-sm">
                      {JSON.stringify(
                        metadata,

                        null,

                        2,
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <form
              onSubmit={submitWorksheet}

              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)]"
            >
              <div className="border-b border-[var(--line)] p-5 sm:p-6">
                <p className="text-xs font-black tracking-[0.18em] text-cyan-300">
                  FORENSIC WORKSHEET
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Complete the investigation report
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Type each value you find in the extracted metadata. Every
                  field must be verified to clear the room.
                </p>
              </div>

              <div className="space-y-8 p-5 sm:p-6">
                {FIELD_GROUPS.map((group) => (
                  <fieldset key={group.title}>
                    <legend className="mb-4 text-xs font-black tracking-[0.16em] text-[var(--muted)]">
                      {group.title}
                    </legend>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {group.fields.map((field) => {
                        const status = fieldStatus(field.name);

                        return (
                          <label
                            key={field.name}

                            className="block"
                          >
                            <span className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
                              <span>{field.label}</span>

                              {status === 'verified' && (
                                <span className="text-xs font-black text-emerald-300">
                                  VERIFIED
                                </span>
                              )}

                              {status === 'incorrect' && (
                                <span className="text-xs font-black text-red-300">
                                  CHECK AGAIN
                                </span>
                              )}
                            </span>

                            <input
                              type="text"

                              value={answers[field.name]}

                              onChange={(event) =>
                                updateAnswer(
                                  field.name,

                                  event.target.value,
                                )
                              }

                              disabled={success}

                              placeholder={field.placeholder}

                              autoComplete="off"

                              className={`w-full rounded-xl border bg-black/20 px-4 py-3 text-base outline-none transition ${
                                status === 'verified'
                                  ? 'border-emerald-400/60'
                                  : status === 'incorrect'
                                    ? 'border-red-400/60'
                                    : 'border-[var(--line)]'
                              }`}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}

                {message && (
                  <div
                    className={`rounded-xl border p-4 ${
                      success
                        ? 'border-emerald-400/30 bg-emerald-400/10'
                        : 'border-amber-400/30 bg-amber-400/10'
                    }`}
                  >
                    <p className="font-bold">{message}</p>

                    {!success && Object.keys(fieldResults).length > 0 && (
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {verifiedCount}
                        {' of '}
                        {totalFields} forensic fields have been verified.
                        Correct the fields marked CHECK AGAIN.
                      </p>
                    )}
                  </div>
                )}

                {success ? (
                  <section className="overflow-hidden rounded-2xl border border-emerald-600 bg-[#03110d]">
                    {/* ==================================
                        ROOM CLEARED HEADER
                    ================================== */}

                    <div className="border-b border-emerald-900 bg-emerald-950/30 px-6 py-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                            ✓ Room 05 Cleared
                          </p>

                          <h2 className="mt-2 text-3xl font-black text-white">
                            Forensic Report Verified
                          </h2>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                            You successfully examined the extracted metadata and
                            identified the hidden information contained inside
                            Maya&apos;s photograph.
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-700 bg-black/30 px-5 py-3 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Room Score
                          </p>

                          <p className="mt-1 text-2xl font-black text-emerald-300">
                            +{score ?? 0}
                          </p>

                          <p className="text-xs text-slate-500">/ 125 points</p>
                        </div>
                      </div>
                    </div>

                    {/* ==================================
                        LESSON + FRAGMENT
                    ================================== */}

                    <div className="px-6 py-8 sm:px-8">
                      <div className="mx-auto max-w-2xl">
                        <MissionTwoLesson roomNumber={5} clue={recoveredClue} />

                        {/* ==================================
                            ESCAPE CODE PROGRESS
                        ================================== */}

                        <div className="mt-8 rounded-2xl border border-slate-800 bg-black/30 p-6 text-center">
                          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                            Escape Code Progress
                          </p>

                          <p className="mt-2 text-sm text-slate-400">
                            Five of the eight encrypted fragments have now been
                            recovered.
                          </p>

                          <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-3">
                            {Array.from({
                              length: 4,
                            }).map((_, index) => (
                              <div
                                key={`completed-${index}`}
                                className="flex h-14 w-12 items-center justify-center rounded-lg border border-emerald-700 bg-emerald-950/20 font-mono text-xl font-black text-emerald-300"
                              >
                                ✓
                              </div>
                            ))}

                            <div className="flex h-14 w-12 items-center justify-center rounded-lg border border-cyan-400 bg-cyan-950/30 font-mono text-2xl font-black text-cyan-300">
                              {recoveredClue ?? '?'}
                            </div>

                            {Array.from({
                              length: 3,
                            }).map((_, index) => (
                              <div
                                key={`future-${index}`}
                                className="flex h-14 w-12 items-center justify-center rounded-lg border border-slate-700 bg-[#07141d] font-mono text-2xl font-black text-slate-600"
                              >
                                ?
                              </div>
                            ))}
                          </div>

                          <p className="mt-5 text-sm font-bold text-cyan-300">
                            5 / 8 fragments recovered
                          </p>

                          <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-cyan-400"
                              style={{
                                width: '62.5%',
                              }}
                            />
                          </div>
                        </div>

                        {/* ==================================
                            INTELLIGENCE NOTICE
                        ================================== */}

                        <div className="mt-6 rounded-xl border border-amber-900 bg-amber-950/20 p-5 text-left">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                            Intelligence Notice
                          </p>

                          <p className="mt-3 leading-7 text-slate-300">
                            The fragment recovered from this room is one of
                            eight characters needed for the final escape code.
                          </p>

                          <p className="mt-3 font-bold text-white">
                            Keep the fragment safe. Three more fragments remain
                            hidden in Rooms 06–08.
                          </p>
                        </div>

                        {/* ==================================
                            NEXT ROOM
                        ================================== */}

                        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6">
                          <div className="text-left">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Next Investigation
                            </p>

                            <p className="mt-1 font-black">
                              Room 06 — The Search Trail
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={continueMission}
                            className="rounded-lg bg-emerald-400 px-6 py-3 font-black text-black transition hover:bg-emerald-300"
                          >
                            Store Fragment &amp; Continue →
                          </button>
                        </div>

                        {previewMode && (
                          <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                            Preview only — no player progress, score or
                            leaderboard data is changed
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                ) : (
                  <button
                    type="submit"

                    disabled={submitting || !extractionStarted}

                    className="btn btn-primary w-full"
                  >
                    {submitting
                      ? 'Verifying Report...'
                      : extractionStarted
                        ? 'Verify Forensic Report'
                        : 'Extract Metadata First'}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
