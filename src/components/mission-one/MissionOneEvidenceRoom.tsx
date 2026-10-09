'use client';



import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';



type EvidenceCategory =

  | 'Emails'

  | 'Logs'

  | 'Messages'

  | 'Files'

  | 'Other';



type Classification =

  | 'Relevant'

  | 'Suspicious'

  | 'Cleared'

  | 'Unsure';



type EvidenceItem = {

  id: string;

  title: string;

  category: EvidenceCategory;

  time: string;

  type: string;

  summary: string;

  detail: React.ReactNode;

};



type Review = {

  classification: Classification;

  notes: string;

};



type SavedReview = {

  evidence_id: string;

  classification: string;

  notes: string | null;

};



const evidence: EvidenceItem[] = [

  {

    id: 'E-01',

    title: 'HR Benefits Email',

    category: 'Emails',

    time: '08:20',

    type: 'Email',

    summary:

      'An internal email regarding the annual employee benefits update.',

    detail: (

      <div className="space-y-4">

        <div className="border-b border-slate-300 pb-4 text-sm text-slate-900">

          <p>

            <strong>From:</strong>{' '}

            benefits@company.com

          </p>

          <p>

            <strong>To:</strong>{' '}

            Maya.Bennett@company.com

          </p>

          <p>

            <strong>Date:</strong>{' '}

            Oct 1, 2026 at 08:20 AM

          </p>

          <p>

            <strong>Subject:</strong>{' '}

            Annual Benefits Enrollment Reminder

          </p>

        </div>



        <p className="text-slate-800">

          Hi Maya,

        </p>



        <p className="text-slate-800">

          This is a reminder that annual benefits

          enrollment opens next Monday. Please visit

          the employee portal from the company

          intranet for additional information.

        </p>



        <p className="text-slate-800">

          Regards,

          <br />

          Human Resources

        </p>

      </div>

    ),

  },



  {

    id: 'E-02',

    title: 'Project Document Email',

    category: 'Emails',

    time: '08:32',

    type: 'Email',

    summary:

      'An email asking Maya to review an updated Project Horizon document.',

    detail: (

      <div className="space-y-4">

        <div className="border-b border-slate-300 pb-4 text-sm text-slate-900">

          <p>

            <strong>From:</strong>{' '}

            Daniel Carter

            {' '}

            &lt;daniel.carter@companny.com&gt;

          </p>



          <p>

            <strong>To:</strong>{' '}

            Maya.Bennett@company.com

          </p>



          <p>

            <strong>Date:</strong>{' '}

            Oct 1, 2026 at 08:32 AM

          </p>



          <p>

            <strong>Subject:</strong>{' '}

            Updated Project Plan — Review Today

          </p>

        </div>



        <p className="text-slate-800">

          Hi Maya,

        </p>



        <p className="text-slate-800">

          Following yesterday&apos;s leadership

          meeting, the revised project plan is now

          available.

        </p>



        <p className="text-slate-800">

          Please review it before the 11:30 AM

          meeting and confirm your feedback.

        </p>



        <div className="my-6">

          <div className="inline-block rounded-md bg-blue-600 px-5 py-3 font-bold text-white">

            Review Document

          </div>

        </div>



        <div className="rounded-lg border border-red-300 bg-red-50 p-4">

          <p className="text-xs font-bold uppercase text-red-600">

            Link inspection

          </p>



          <p className="mt-2 break-all text-sm text-slate-900">

            https://companny.com/projects/plan-update

          </p>



          <p className="mt-3 font-bold text-red-600">

            ⚠ Domain does not match the official

            company domain.

          </p>

        </div>



        <p className="text-slate-800">

          Thanks,

          <br />

          Daniel Carter

          <br />

          Operations Team

        </p>

      </div>

    ),

  },



  {

    id: 'E-03',

    title: 'MFA Notification',

    category: 'Messages',

    time: '08:48',

    type: 'Authentication Alert',

    summary:

      'An MFA request was approved for Maya’s account shortly after the document link was opened.',

    detail: (

      <div className="space-y-5">

        <div className="rounded-xl border border-slate-300 p-5">

          <p className="text-sm text-slate-500">

            Microsoft Authentication

          </p>



          <h3 className="mt-2 text-xl font-bold text-slate-900">

            Sign-in request approved

          </h3>



          <dl className="mt-5 space-y-3 text-slate-800">

            <div>

              <dt className="text-xs uppercase text-slate-500">

                User

              </dt>

              <dd>Maya Bennett</dd>

            </div>



            <div>

              <dt className="text-xs uppercase text-slate-500">

                Time

              </dt>

              <dd>08:48 AM</dd>

            </div>



            <div>

              <dt className="text-xs uppercase text-slate-500">

                Location

              </dt>

              <dd>Kingston, Jamaica</dd>

            </div>



            <div>

              <dt className="text-xs uppercase text-slate-500">

                Action

              </dt>

              <dd>Request approved</dd>

            </div>

          </dl>

        </div>

      </div>

    ),

  },



  {

    id: 'E-04',

    title: 'Login Activity Log',

    category: 'Logs',

    time: '08:49',

    type: 'Security Log',

    summary:

      'Login history for Maya Bennett’s account during the morning of the incident.',

    detail: (

      <div>

        <table className="w-full text-left text-sm text-slate-900">

          <thead>

            <tr className="border-b">

              <th className="p-2">

                Time

              </th>

              <th className="p-2">

                Device

              </th>

              <th className="p-2">

                Result

              </th>

            </tr>

          </thead>



          <tbody>

            <tr className="border-b">

              <td className="p-2">

                07:56

              </td>

              <td className="p-2">

                MAYA-LAPTOP

              </td>

              <td className="p-2 text-green-700">

                Success

              </td>

            </tr>



            <tr className="border-b bg-red-50">

              <td className="p-2">

                08:49

              </td>

              <td className="p-2 font-bold">

                WIN-91K2

              </td>

              <td className="p-2 text-red-700">

                Success

              </td>

            </tr>



            <tr>

              <td className="p-2">

                09:17

              </td>

              <td className="p-2 font-bold">

                WIN-91K2

              </td>

              <td className="p-2 text-red-700">

                Restricted folder accessed

              </td>

            </tr>

          </tbody>

        </table>

      </div>

    ),

  },



  {

    id: 'E-05',

    title: 'Teams Message',

    category: 'Messages',

    time: '08:15',

    type: 'Internal Message',

    summary:

      'A normal Teams conversation relating to the morning meeting.',

    detail: (

      <div className="space-y-4 text-slate-900">

        <div className="rounded-lg bg-slate-100 p-4">

          <p className="font-bold">

            Daniel Carter

          </p>

          <p className="mt-1">

            Morning Maya. We are still on for the

            11:30 Project Horizon meeting.

          </p>

        </div>



        <div className="ml-10 rounded-lg bg-blue-100 p-4">

          <p className="font-bold">

            Maya Bennett

          </p>

          <p className="mt-1">

            Yes. I&apos;ll be there.

          </p>

        </div>

      </div>

    ),

  },



  {

    id: 'E-06',

    title: 'Calendar Invitation',

    category: 'Files',

    time: '07:55',

    type: 'Calendar',

    summary:

      'The legitimate Project Horizon meeting invitation.',

    detail: (

      <div className="rounded-xl border border-slate-300 p-5 text-slate-900">

        <h3 className="text-xl font-bold">

          Project Horizon Review

        </h3>



        <p className="mt-4">

          <strong>Time:</strong>{' '}

          11:30 AM – 12:15 PM

        </p>



        <p>

          <strong>Organizer:</strong>{' '}

          Daniel Carter

        </p>



        <p>

          <strong>Location:</strong>{' '}

          Conference Room 2

        </p>



        <p className="mt-4">

          Review final project materials ahead of

          leadership presentation.

        </p>

      </div>

    ),

  },



  {

    id: 'E-07',

    title: 'Browser History',

    category: 'Logs',

    time: '08:41',

    type: 'Browser Artifact',

    summary:

      'Browser activity from Maya’s workstation shortly before the suspicious login.',

    detail: (

      <div className="space-y-3 text-sm text-slate-900">

        <div className="rounded border p-3">

          08:35 — company.com/intranet

        </div>



        <div className="rounded border border-red-300 bg-red-50 p-3 font-bold text-red-700">

          08:41 — companny.com/projects/plan-update

        </div>



        <div className="rounded border border-red-300 bg-red-50 p-3">

          08:42 — login.companny-secure.com

        </div>



        <div className="rounded border p-3">

          08:45 — company.com/finance

        </div>

      </div>

    ),

  },



  {

    id: 'E-08',

    title: 'QR Code Poster',

    category: 'Other',

    time: '08:10',

    type: 'Physical Evidence',

    summary:

      'A cybersecurity awareness QR code poster displayed near the Finance Department.',

    detail: (

      <div className="text-center text-slate-900">

        <div className="mx-auto flex h-44 w-44 items-center justify-center border-8 border-slate-900 bg-white text-6xl">

          ▦

        </div>



        <h3 className="mt-5 text-xl font-black">

          CYBER SECURITY AWARENESS

        </h3>



        <p className="mt-2">

          Scan for this month&apos;s security tips.

        </p>



        <p className="mt-4 text-sm text-slate-500">

          Poster verified as an official IT

          Department communication.

        </p>

      </div>

    ),

  },



  {

    id: 'E-09',

    title: 'External File Share',

    category: 'Files',

    time: '09:24',

    type: 'Cloud Activity',

    summary:

      'A file was shared externally several minutes after the restricted folder was accessed.',

    detail: (

      <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-slate-900">

        <p className="text-xs font-bold uppercase text-red-600">

          Cloud Activity Alert

        </p>



        <h3 className="mt-2 text-xl font-black">

          External Share Created

        </h3>



        <dl className="mt-5 space-y-3">

          <div>

            <dt className="text-xs uppercase text-slate-500">

              Time

            </dt>

            <dd>09:24 AM</dd>

          </div>



          <div>

            <dt className="text-xs uppercase text-slate-500">

              File

            </dt>

            <dd>

              Project_Horizon_Financials.xlsx

            </dd>

          </div>



          <div>

            <dt className="text-xs uppercase text-slate-500">

              Account

            </dt>

            <dd>

              Maya Bennett

            </dd>

          </div>



          <div>

            <dt className="text-xs uppercase text-slate-500">

              Recipient

            </dt>

            <dd>

              External account

            </dd>

          </div>

        </dl>

      </div>

    ),

  },



  {

    id: 'E-10',

    title: 'Out of Office Reply',

    category: 'Emails',

    time: 'Yesterday',

    type: 'Email',

    summary:

      'An automatic reply revealing information about the Project Horizon schedule.',

    detail: (

      <div className="space-y-4 text-slate-900">

        <div className="border-b pb-4 text-sm">

          <p>

            <strong>Subject:</strong>{' '}

            Automatic Reply

          </p>

        </div>



        <p>

          Thank you for your message.

        </p>



        <p>

          I am away from my desk this afternoon

          preparing materials for tomorrow&apos;s

          Project Horizon review.

        </p>



        <p>

          For urgent Finance matters, please

          contact Maya Bennett.

        </p>



        <p>

          I will return before the 11:30 AM Project

          Horizon meeting.

        </p>



        <p className="text-slate-500">

          — Andrew Campbell

          <br />

          Finance Supervisor

        </p>

      </div>

    ),

  },

];



export default function MissionOneEvidenceRoom({

  playerAlias,

  playerId,

  initialReviews,

}: {

  playerAlias: string;

  playerId: string;

  initialReviews: SavedReview[];

}) {

  const router = useRouter();



  const supabase = createClient();



  const [selectedEvidence, setSelectedEvidence] =

    useState<EvidenceItem | null>(null);



  const [activeCategory, setActiveCategory] =

    useState<'All' | EvidenceCategory>('All');



  const [reviews, setReviews] =
    useState<Record<string, Review>>(() => {
      const loaded: Record<string, Review> = {};

      for (const review of initialReviews) {
        loaded[review.evidence_id] = {
          classification:
            review.classification as Classification,
          notes: review.notes ?? '',
        };
      }

      return loaded;
    });

  const [saving, setSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState('');

  const [continuing, setContinuing] =
    useState(false);

  const [continueError, setContinueError] =
    useState('');



  const filteredEvidence = useMemo(() => {

    if (activeCategory === 'All') {

      return evidence;

    }



    return evidence.filter(

      (item) =>

        item.category === activeCategory

    );

  }, [activeCategory]);



  const reviewedCount =

    Object.keys(reviews).length;



  const canContinue =

    reviewedCount >= 7;



  async function saveReview(
    itemId: string,
    classification: Classification,
    notes: string
  ) {
    setSaving(true);
    setSaveError('');

    try {
      const { error: reviewError } =
        await supabase
          .from('mission_evidence_reviews')
          .upsert(
            {
              player_id: playerId,
              mission_id: 1,
              evidence_id: itemId,
              classification,
              notes: notes.trim(),
              reviewed_at:
                new Date().toISOString(),
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict:
                'player_id,mission_id,evidence_id',
            }
          );

      if (reviewError) {
        console.error(
          '[EVIDENCE ROOM] Save failed:',
          reviewError
        );

        throw new Error(reviewError.message);
      }

      setReviews((current) => ({
        ...current,
        [itemId]: {
          classification,
          notes: notes.trim(),
        },
      }));

      setSelectedEvidence(null);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Unable to save evidence analysis.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function continueToTheory() {
    if (!canContinue || continuing) {
      return;
    }

    setContinuing(true);
    setContinueError('');

    try {
      const { error: stageError } =
        await supabase
          .from('mission_attempts')
          .update({
            current_stage: 'theory',
          })
          .eq('player_id', playerId)
          .eq('mission_id', 1);

      if (stageError) {
        console.error(
          '[EVIDENCE ROOM] Stage update failed:',
          stageError
        );

        throw new Error(stageError.message);
      }

      router.push('/missions/1/play/theory');
    } catch (error) {
      setContinueError(
        error instanceof Error
          ? error.message
          : 'Unable to continue to the theory stage.'
      );
      setContinuing(false);
    }
  }



  return (

    <main className="min-h-screen bg-[#02080d] text-white">

      {/* TOP BAR */}



      <header className="border-b border-cyan-950 bg-[#061019]">

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">

                Mission 01

              </p>



              <h1 className="text-xl font-black">

                THE BREACH

              </h1>

            </div>



            <div className="text-right">

              <p className="text-xs uppercase text-slate-500">

                Operative

              </p>



              <p className="font-bold">

                {playerAlias}

              </p>

            </div>

          </div>



          {/* PROGRESS */}



          <div className="mt-6 grid grid-cols-5 gap-2 text-center text-[10px] uppercase tracking-wider text-slate-500">

            <div>

              <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400 text-emerald-400">

                ✓

              </div>

              <p className="mt-2">

                Briefing

              </p>

            </div>



            <div>

              <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 border-cyan-400 bg-cyan-950 text-cyan-300">

                2

              </div>

              <p className="mt-2 text-cyan-300">

                Evidence Room

              </p>

            </div>



            <div>

              <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-slate-600">

                3

              </div>

              <p className="mt-2">

                Build Your Theory

              </p>

            </div>



            <div>

              <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-slate-600">

                4

              </div>

              <p className="mt-2">

                Containment

              </p>

            </div>



            <div>

              <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-slate-600">

                5

              </div>

              <p className="mt-2">

                Breach Report

              </p>

            </div>

          </div>

        </div>

      </header>



      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* TITLE */}



        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">

              Investigation Workspace

            </p>



            <h2 className="mt-2 text-3xl font-black">

              Evidence Room

            </h2>



            <p className="mt-2 text-slate-400">

              Review the available evidence and

              classify each item.

            </p>

          </div>



          <div className="rounded-lg border border-cyan-900 bg-[#07141d] px-5 py-3">

            <p className="text-xs uppercase text-slate-500">

              Evidence reviewed

            </p>



            <p className="mt-1 text-xl font-black text-cyan-300">

              {reviewedCount} / 10

            </p>

          </div>

        </div>



        {/* FILTERS */}



        <div className="mb-6 flex flex-wrap gap-2">

          {[

            'All',

            'Emails',

            'Logs',

            'Messages',

            'Files',

            'Other',

          ].map((category) => {

            const count =

              category === 'All'

                ? evidence.length

                : evidence.filter(

                    (item) =>

                      item.category ===

                      category

                  ).length;



            return (

              <button

                key={category}

                type="button"

                onClick={() =>

                  setActiveCategory(

                    category as

                      | 'All'

                      | EvidenceCategory

                  )

                }

                className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${

                  activeCategory === category

                    ? 'border-cyan-400 bg-cyan-500 text-black'

                    : 'border-slate-700 bg-[#07141d] text-slate-300 hover:border-cyan-600'

                }`}

              >

                {category === 'All'

                  ? 'All Evidence'

                  : category}{' '}

                ({count})

              </button>

            );

          })}

        </div>



        {/* EVIDENCE GRID */}



        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          {filteredEvidence.map((item) => {

            const review =

              reviews[item.id];



            return (

              <button

                key={item.id}

                type="button"

                onClick={() =>

                  setSelectedEvidence(item)

                }

                className="group overflow-hidden rounded-xl border border-cyan-950 bg-[#061019] text-left transition hover:-translate-y-1 hover:border-cyan-500"

              >

                <div className="flex h-28 items-center justify-center border-b border-cyan-950 bg-[#0a1821]">

                  <span className="text-4xl">

                    {item.category === 'Emails' &&

                      '✉️'}



                    {item.category === 'Logs' &&

                      '📊'}



                    {item.category ===

                      'Messages' && '💬'}



                    {item.category === 'Files' &&

                      '📁'}



                    {item.category === 'Other' &&

                      '🔎'}

                  </span>

                </div>



                <div className="p-4">

                  <div className="flex items-center justify-between">

                    <p className="text-xs font-black text-cyan-400">

                      {item.id}

                    </p>



                    {review && (

                      <span className="text-xs font-bold text-emerald-400">

                        ✓ REVIEWED

                      </span>

                    )}

                  </div>



                  <h3 className="mt-2 font-black">

                    {item.title}

                  </h3>



                  <p className="mt-2 text-xs text-slate-500">

                    {item.time}

                  </p>



                  {review && (

                    <div className="mt-3 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300">

                      {review.classification}

                    </div>

                  )}

                </div>

              </button>

            );

          })}

        </section>



        {/* BOTTOM STATUS */}



        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-950 bg-[#061019] p-5">

          <div>

            {!canContinue ? (

              <>

                <p className="font-bold">

                  Continue investigating.

                </p>



                <p className="mt-1 text-sm text-slate-500">

                  Review at least 7 of the 10

                  evidence files before building

                  your theory.

                </p>

              </>

            ) : (

              <>

                <p className="font-bold text-emerald-400">

                  Evidence requirement met.

                </p>



                <p className="mt-1 text-sm text-slate-500">

                  You may now proceed to build

                  your theory.

                </p>

              </>

            )}

          </div>



          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              disabled={!canContinue || continuing}
              onClick={() => {
                void continueToTheory();
              }}
              className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {continuing
                ? 'Saving Progress...'
                : 'Build Your Theory →'}
            </button>

            {continueError && (
              <p className="max-w-md text-right text-sm text-red-300">
                {continueError}
              </p>
            )}
          </div>

        </div>

      </div>



      {/* EVIDENCE VIEWER */}



      {selectedEvidence && (

        <EvidenceModal
          evidence={selectedEvidence}
          existingReview={
            reviews[selectedEvidence.id]
          }
          onClose={() => {
            if (!saving) {
              setSaveError('');
              setSelectedEvidence(null);
            }
          }}
          onSave={saveReview}
          saving={saving}
          saveError={saveError}
        />

      )}

    </main>

  );

}



function EvidenceModal({
  evidence,
  existingReview,
  onClose,
  onSave,
  saving,
  saveError,
}: {
  evidence: EvidenceItem;
  existingReview?: Review;
  onClose: () => void;
  onSave: (
    id: string,
    classification: Classification,
    notes: string
  ) => Promise<void>;
  saving: boolean;
  saveError: string;
}) {

  const [classification, setClassification] =

    useState<Classification | null>(

      existingReview?.classification ?? null

    );



  const [notes, setNotes] =

    useState(existingReview?.notes ?? '');



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">

      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-cyan-800 bg-[#061019] shadow-2xl">

        {/* MODAL HEADER */}



        <header className="flex items-center justify-between border-b border-cyan-950 px-5 py-4">

          <div>

            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">

              Evidence File

            </p>



            <h2 className="mt-1 text-lg font-black">

              {evidence.id}: {evidence.title}

            </h2>

          </div>



          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-700 px-3 py-2 text-slate-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✕
          </button>

        </header>



        <div className="grid max-h-[80vh] overflow-y-auto lg:grid-cols-[1.35fr_.65fr]">

          {/* EVIDENCE */}



          <div className="bg-slate-100 p-6">

            <div className="mb-5">

              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">

                {evidence.type}

              </p>



              <p className="mt-2 text-sm text-slate-700">

                {evidence.summary}

              </p>

            </div>



            <div className="rounded-xl bg-white p-6 shadow">

              {evidence.detail}

            </div>

          </div>



          {/* ANALYSIS */}



          <aside className="p-6">

            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">

              Analyze This Item

            </p>



            <p className="mt-5 text-sm text-slate-400">

              Mark as:

            </p>



            <div className="mt-3 grid gap-3">

              {(

                [

                  'Relevant',

                  'Suspicious',

                  'Cleared',

                  'Unsure',

                ] as Classification[]

              ).map((option) => (

                <button

                  key={option}

                  type="button"

                  onClick={() =>

                    setClassification(option)

                  }

                  className={`rounded-lg border px-4 py-3 text-left font-bold transition ${

                    classification === option

                      ? option === 'Suspicious'

                        ? 'border-red-400 bg-red-950 text-red-300'

                        : option === 'Cleared'

                          ? 'border-emerald-400 bg-emerald-950 text-emerald-300'

                          : option === 'Unsure'

                            ? 'border-amber-400 bg-amber-950 text-amber-300'

                            : 'border-cyan-400 bg-cyan-950 text-cyan-300'

                      : 'border-slate-700 bg-[#07141d] text-slate-300'

                  }`}

                >

                  {option}

                </button>

              ))}

            </div>



            <label className="mt-6 block">

              <span className="text-sm text-slate-400">

                Why do you think this?

              </span>



              <textarea

                value={notes}

                onChange={(event) =>

                  setNotes(event.target.value)

                }

                maxLength={500}

                placeholder="Add your investigation notes..."

                className="mt-2 min-h-32 w-full resize-none rounded-lg border border-slate-700 bg-[#02080d] p-3 text-sm text-white outline-none focus:border-cyan-400"

              />



              <span className="mt-1 block text-right text-xs text-slate-600">

                {notes.length}/500

              </span>

            </label>



            <button
              type="button"
              disabled={!classification || saving}
              onClick={() => {
                if (!classification) {
                  return;
                }

                void onSave(
                  evidence.id,
                  classification,
                  notes
                );
              }}
              className="mt-5 w-full rounded-lg bg-cyan-400 px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {saving
                ? 'Saving Analysis...'
                : 'Save Analysis'}
            </button>

            {saveError && (
              <div className="mt-3 rounded-lg border border-red-900 bg-red-950/30 p-3">
                <p className="text-sm text-red-300">
                  {saveError}
                </p>
              </div>
            )}

          </aside>

        </div>

      </div>

    </div>

  );

}