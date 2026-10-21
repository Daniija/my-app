'use client';

import { useState } from 'react';
import Link from 'next/link';

type Report = {
  evidence_score: number;
  theory_score: number;
  containment_score: number;
  bonus_score: number;
  total_score: number;
};

export default function MissionOneReport({
  playerAlias,
  initialReport,
}: {
  playerAlias: string;
  initialReport: Report | null;
}) {
  const [report, setReport] =
    useState<Report | null>(
      initialReport
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  async function generateReport() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        '/api/missions/1/complete',
        {
          method: 'POST',
        }
      );

      const contentType =
  response.headers.get('content-type');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- parsed JSON/text response of unknown shape
let body: any = null;

if (
  contentType?.includes('application/json')
) {
  body = await response.json();
} else {
  const text = await response.text();

  console.error(
    '[MISSION 01 REPORT] Server returned HTML:',
    {
      status: response.status,
      contentType,
      text,
    }
  );

  throw new Error(
    `Mission report API failed with HTTP ${response.status}. Check the terminal running npm run dev.`
  );
}

        // Keep this block
      if (!response.ok) {
        throw new Error(
          body?.message ??
            'Unable to generate report.'
        );
      }

      setReport({
        evidence_score:
          body.score.evidence,
        theory_score:
          body.score.theory,
        containment_score:
          body.score.containment,
        bonus_score:
          body.score.bonus,
        total_score:
          body.score.total,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Report generation failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-[#02080d] px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <section className="rounded-2xl border border-cyan-900 bg-[#061019] p-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
              Cyber Defence Unit
            </p>

            <h1 className="mt-4 text-4xl font-black">
              Investigation Complete
            </h1>

            <p className="mt-4 text-slate-400">
              Your evidence assessment,
              attack theory and containment
              response are ready for
              evaluation.
            </p>

            {error && (
              <p className="mt-5 text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void generateReport()
              }
              className="mt-7 rounded-lg bg-cyan-400 px-7 py-3 font-black text-black"
            >
              {loading
                ? 'Analyzing Investigation...'
                : 'Generate Breach Report'}
            </button>
          </section>
        </div>
      </main>
    );
  }

  const percentage =
    Math.round(
      (report.total_score / 1500) *
        100
    );

  return (
    <main className="min-h-screen bg-[#02080d] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
            Mission Complete
          </p>

          <h1 className="mt-3 text-4xl font-black">
            BREACH REPORT
          </h1>

          <p className="mt-2 text-slate-400">
            Operative {playerAlias}
          </p>
        </div>

        <section className="mt-8 rounded-2xl border border-cyan-900 bg-[#061019] p-8 text-center">
          <p className="text-sm uppercase tracking-widest text-slate-500">
            Final Mission Score
          </p>

          <p className="mt-3 text-6xl font-black text-cyan-300">
            {report.total_score}
          </p>

          <p className="mt-1 text-xl text-slate-500">
            / 1500
          </p>

          <p className="mt-4 font-bold text-emerald-400">
            {percentage}% Investigation Accuracy
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <ScoreCard
            label="Evidence"
            score={report.evidence_score}
            max={500}
          />

          <ScoreCard
            label="Theory"
            score={report.theory_score}
            max={600}
          />

          <ScoreCard
            label="Containment"
            score={
              report.containment_score
            }
            max={350}
          />

          <ScoreCard
            label="Intel Bonus"
            score={report.bonus_score}
            max={50}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-red-900 bg-red-950/10 p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
            Incident Finding
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Credential Phishing Confirmed
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            Maya Bennett received a
            convincing Project Horizon email
            directing her to a fraudulent
            login page. Her credentials were
            captured and an MFA request was
            subsequently approved.
          </p>

          <p className="mt-4 leading-7 text-slate-300">
            The attacker then authenticated
            from the unfamiliar WIN-91K2
            device, accessed restricted
            Finance information, and created
            an external share containing
            Project Horizon financial data.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-950 bg-[#061019] p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
            Classified Intelligence
          </p>

          <h2 className="mt-2 text-xl font-black">
            One question remains.
          </h2>

          <p className="mt-4 leading-7 text-slate-300">
            The phishing message referenced
            Project Horizon, Maya Bennett,
            and the confidential 11:30
            meeting.
          </p>

          <p className="mt-4 font-bold text-amber-300">
            How did the attacker know?
          </p>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Next Mission
            </p>

            <p className="mt-1 text-xl font-black">
              MISSION 02 — THE DIGITAL
              FOOTPRINT
            </p>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-6 py-3 font-bold"
          >
            Return to Dashboard
          </Link>

          <Link
            href="/leaderboard"
            className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black"
          >
            View Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}

function ScoreCard({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  return (
    <div className="rounded-xl border border-cyan-950 bg-[#061019] p-5 text-center">
      <p className="text-xs uppercase text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {score}
      </p>

      <p className="text-xs text-slate-600">
        / {max}
      </p>
    </div>
  );
}