'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type EvidenceCategory =
  | 'Emails'
  | 'Logs'
  | 'Messages'
  | 'Files'
  | 'Other';

type Classification =
  | 'Suspicious'
  | 'Cleared';

type EvidenceItem = {
  id: string;
  title: string;
  category: EvidenceCategory;
  time: string;
  type: string;
  summary: string;
  detail: ReactNode;
};

type Review = {
  classification: Classification;
  notes: string;
  correct?: boolean;
  feedback?: string;
};

type SavedReview = {
  evidence_id: string;
  classification: string;
  notes: string | null;
};

const PROJECT_LINK =
  'https://sharepoint.brightwell-docs.example/sites/project-horizon/Shared%20Documents/Project-Horizon-Review.docx';

const QR_LINK =
  'https://intranet.brightwellgroup.example/it/security-awareness/october-2026';

const ANSWER_KEY: Record<string, Classification> = {
  'E-01': 'Cleared',
  'E-02': 'Suspicious',
  'E-03': 'Cleared',
  'E-04': 'Suspicious',
  'E-05': 'Cleared',
  'E-06': 'Cleared',
  'E-07': 'Suspicious',
  'E-08': 'Cleared',
  'E-09': 'Suspicious',
  'E-10': 'Suspicious',
};

const FEEDBACK: Record<string, string> = {
  'E-01':
    'This is a normal internal HR message using the expected company domain.',
  'E-02':
    'The sender uses the unfamiliar document-sharing domain brightwell-docs.example. Hovering over Review Document also reveals a look-alike destination.',
  'E-03':
    'MFA is a form of authentication that adds an extra layer of security. In this scenario, the attacker cannot get into the account without successfully completing the MFA step, so this item should be cleared.',
  'E-04':
    'A previously unseen device successfully accesses the account and later reaches a restricted folder.',
  'E-05':
    'This is normal internal communication confirming the scheduled Project Horizon meeting.',
  'E-06':
    'This is the legitimate calendar invitation for the Project Horizon meeting.',
  'E-07':
    'The browser history contains look-alike domains shortly before the suspicious sign-in.',
  'E-08':
    'The poster is verified as an official IT Department communication. Hovering over the QR code shows the expected company security-awareness link.',
  'E-09':
    'Sensitive Project Horizon data is shared externally after the suspicious account activity.',
  'E-10':
    'This message exposes project timing and identifies Maya as a Finance contact, which could help an attacker build a convincing phishing lure. Treat it as suspicious information exposure.',
};

function displayClassification(
  evidenceId: string,
  storedValue: string
): Classification {
  if (
    storedValue === 'Suspicious' ||
    storedValue === 'Cleared'
  ) {
    return storedValue;
  }

  // Older saved "Relevant" answers are shown as Suspicious.
  // This also keeps E-10 compatible with the old scoring route.
  return 'Suspicious';
}

function storedClassification(
  evidenceId: string,
  selected: Classification
): string {
  // Preserve compatibility with the existing final scoring route.
  // E-10 is shown to the player as Suspicious but is stored as
  // Relevant because the current completion route still expects that.
  if (
    evidenceId === 'E-10' &&
    selected === 'Suspicious'
  ) {
    return 'Relevant';
  }

  return selected;
}

function OutlookShell({
  senderName,
  senderEmail,
  subject,
  date,
  children,
}: {
  senderName: string;
  senderEmail: string;
  subject: string;
  date: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-[#f3f6fb] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded bg-[#0f6cbd] text-sm font-black text-white">
            O
          </div>
          <div>
            <p className="text-sm font-semibold">
              Outlook
            </p>
            <p className="text-[11px] text-slate-500">
              Mail
            </p>
          </div>
        </div>

        <div className="flex gap-3 text-xs text-slate-500">
          <span>Reply</span>
          <span>Forward</span>
          <span>⋯</span>
        </div>
      </div>

      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold">
          {subject}
        </h3>

        <div className="mt-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#dbeafe] font-black text-[#0f6cbd]">
            {senderName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {senderName}
                </p>
                <p className="break-all text-xs text-slate-500">
                  &lt;{senderEmail}&gt;
                </p>
              </div>

              <p className="text-xs text-slate-500">
                {date}
              </p>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              To: Maya Bennett &lt;maya.bennett@brightwellgroup.example&gt;
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 text-[15px] leading-6">
        {children}
      </div>
    </div>
  );
}

function HoverLinkButton() {
  return (
    <div className="group relative my-6 inline-block">
      <div className="cursor-default rounded-md bg-[#0f6cbd] px-5 py-3 text-sm font-semibold text-white shadow-sm transition group-hover:bg-[#115ea3]">
        Review Document
      </div>

      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-3 hidden min-w-[320px] max-w-[420px] rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-left text-xs text-white shadow-2xl group-hover:block">
        <p className="mb-1 font-bold text-cyan-300">
          Link destination
        </p>

        <p className="break-all leading-5">
          {PROJECT_LINK}
        </p>

        <div className="absolute left-8 top-full h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-slate-950" />
      </div>
    </div>
  );
}

function TeamsConversation() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#d6d5e6] bg-white text-slate-900 shadow-sm">
      <div className="flex items-center justify-between bg-[#5b5fc7] px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-white/15 font-black">
            T
          </div>

          <div>
            <p className="text-sm font-semibold">
              Microsoft Teams
            </p>
            <p className="text-[11px] text-white/75">
              Chat
            </p>
          </div>
        </div>

        <div className="flex gap-3 text-sm text-white/80">
          <span>⌕</span>
          <span>⋯</span>
        </div>
      </div>

      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e7e6ff] font-black text-[#5b5fc7]">
            DC
          </div>

          <div>
            <p className="font-semibold">
              Daniel Carter
            </p>
            <p className="text-xs text-emerald-600">
              ● Available
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 bg-[#f7f7fb] p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e7e6ff] text-xs font-black text-[#5b5fc7]">
            DC
          </div>

          <div className="max-w-[82%]">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold">
                Daniel Carter
              </span>
              <span className="text-[10px] text-slate-400">
                8:15 AM
              </span>
            </div>

            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
              Morning Maya. We are still on for the
              11:30 Project Horizon meeting.
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[82%]">
            <div className="mb-1 text-right text-[10px] text-slate-400">
              8:16 AM
            </div>

            <div className="rounded-2xl rounded-tr-sm bg-[#e7e6ff] px-4 py-3 text-sm">
              Yes. I&apos;ll be there.
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <p className="text-[10px] text-slate-400">
            Read 8:16 AM
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <div className="rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-400">
          Type a new message
        </div>
      </div>
    </div>
  );
}

const qrCells = [
  '111111100101101111111',
  '100000100010101000001',
  '101110101110101011101',
  '101110100101001011101',
  '101110101011101011101',
  '100000101100101000001',
  '111111101010101111111',
  '000000000111000000000',
  '101011101001111010101',
  '001101001111001101100',
  '110011110010110011011',
  '011100001101001110010',
  '101011111011111010101',
  '000000001010100010100',
  '111111101110101010111',
  '100000101001001010010',
  '101110101111111011101',
  '101110100100001000110',
  '101110101011101111001',
  '100000100110001001010',
  '111111101001111101111',
];

function BetterQrCode() {
  return (
    <div className="group relative mx-auto w-fit">
      <div
        className="grid h-48 w-48 bg-white p-3 shadow-sm ring-1 ring-slate-300"
        style={{
          gridTemplateColumns:
            'repeat(21, minmax(0, 1fr))',
          gridTemplateRows:
            'repeat(21, minmax(0, 1fr))',
        }}
        aria-label="Cyber security awareness QR code"
      >
        {qrCells.flatMap((row, rowIndex) =>
          row.split('').map((cell, columnIndex) => (
            <span
              key={`${rowIndex}-${columnIndex}`}
              className={
                cell === '1'
                  ? 'bg-slate-950'
                  : 'bg-white'
              }
            />
          ))
        )}
      </div>

      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 hidden w-80 -translate-x-1/2 rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-left text-xs text-white shadow-2xl group-hover:block">
        <p className="mb-1 font-bold text-cyan-300">
          QR destination
        </p>

        <p className="break-all leading-5">
          {QR_LINK}
        </p>

        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-slate-950" />
      </div>
    </div>
  );
}

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
      <OutlookShell
        senderName="Human Resources"
        senderEmail="benefits@brightwellgroup.example"
        subject="Annual Benefits Enrollment Reminder"
        date="Oct 1, 2026 · 8:20 AM"
      >
        <p>Hi Maya,</p>
        <p>
          This is a reminder that annual benefits
          enrollment opens next Monday. Please visit
          the employee portal from the company
          intranet for additional information.
        </p>
        <p>
          Regards,
          <br />
          Human Resources
        </p>
      </OutlookShell>
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
      <OutlookShell
        senderName="Daniel Carter"
        senderEmail="daniel.carter@brightwell-docs.example"
        subject="Updated Project Plan — Review Today"
        date="Oct 1, 2026 · 8:32 AM"
      >
        <p>Hi Maya,</p>
        <p>
          Following yesterday&apos;s leadership
          meeting, the revised project plan is now
          available.
        </p>
        <p>
          Please review it before the 11:30 AM
          meeting and confirm your feedback.
        </p>

        <HoverLinkButton />

        <p>
          Thanks,
          <br />
          Daniel Carter
          <br />
          Operations Team
        </p>
      </OutlookShell>
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
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-[#f3f6fb] px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#2563eb] text-sm font-black text-white">
            M
          </div>

          <div>
            <p className="font-semibold">
              Microsoft Authenticator
            </p>
            <p className="text-xs text-slate-500">
              Security notification
            </p>
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-xl font-bold">
            Sign-in request approved
          </h3>

          <dl className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200 text-sm">
            {[
              ['User', 'Maya Bennett'],
              ['Time', '08:48 AM'],
              ['Location', 'Kingston, Jamaica'],
              ['Action', 'Request approved'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3"
              >
                <dt className="text-slate-500">
                  {label}
                </dt>
                <dd className="font-medium">
                  {value}
                </dd>
              </div>
            ))}
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
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Identity Security · Sign-in Activity
          </p>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Device</th>
              <th className="p-3">Result</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-3">07:56</td>
              <td className="p-3">MAYA-LAPTOP</td>
              <td className="p-3 text-emerald-700">
                Success
              </td>
            </tr>

            <tr className="border-t bg-amber-50">
              <td className="p-3">08:49</td>
              <td className="p-3 font-bold">
                WIN-91K2
              </td>
              <td className="p-3 font-semibold">
                Success
              </td>
            </tr>

            <tr className="border-t bg-amber-50">
              <td className="p-3">09:17</td>
              <td className="p-3 font-bold">
                WIN-91K2
              </td>
              <td className="p-3 font-semibold">
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
    detail: <TeamsConversation />,
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
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
        <div className="border-b border-slate-200 bg-[#f3f6fb] px-5 py-4">
          <p className="text-xs font-bold uppercase text-[#0f6cbd]">
            Outlook Calendar
          </p>
          <h3 className="mt-1 text-xl font-semibold">
            Project Horizon Review
          </h3>
        </div>

        <div className="grid gap-4 p-5 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-500">
              Time
            </p>
            <p className="font-medium">
              11:30 AM – 12:15 PM
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500">
              Organizer
            </p>
            <p className="font-medium">
              Daniel Carter
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500">
              Location
            </p>
            <p className="font-medium">
              Conference Room 2
            </p>
          </div>

          <p className="border-t border-slate-200 pt-4">
            Review final project materials ahead of
            leadership presentation.
          </p>
        </div>
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
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-sm text-slate-900 shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold">
          Browser History
        </div>

        {[
          ['08:35', 'https://intranet.brightwellgroup.example/home'],
          ['08:41', 'https://sharepoint.brightwell-docs.example/sites/project-horizon/Shared%20Documents/Project-Horizon-Review.docx'],
          ['08:42', 'https://login.brightwell-docs.example/microsoft365/signin'],
          ['08:45', 'https://finance.brightwellgroup.example/dashboard'],
        ].map(([time, url]) => (
          <div
            key={`${time}-${url}`}
            className="grid grid-cols-[70px_1fr] gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
          >
            <span className="text-slate-500">
              {time}
            </span>
            <span className="break-all">
              {url}
            </span>
          </div>
        ))}
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
      <div className="rounded-xl border border-slate-300 bg-white p-7 text-center text-slate-900 shadow-sm">
        <div className="mx-auto max-w-sm rounded-lg border-4 border-slate-900 px-6 py-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#0f6cbd]">
            IT Security
          </p>

          <h3 className="mt-2 text-2xl font-black">
            CYBER SECURITY
            <br />
            AWARENESS
          </h3>

          <p className="mt-2 text-xs text-slate-500">
            Think before you click.
          </p>

          <div className="my-6">
            <BetterQrCode />
          </div>

          <p className="text-sm font-semibold">
            Scan for this month&apos;s security tips
          </p>
        </div>

        <p className="mt-5 text-sm text-slate-500">
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
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm">
        <div className="border-b border-slate-200 bg-[#f3f6fb] px-5 py-4">
          <p className="text-xs font-bold uppercase text-[#0f6cbd]">
            Cloud Activity
          </p>
          <h3 className="mt-1 text-xl font-semibold">
            External Share Created
          </h3>
        </div>

        <dl className="divide-y divide-slate-200 text-sm">
          {[
            ['Time', '09:24 AM'],
            ['File', 'Project_Horizon_Financials.xlsx'],
            ['Account', 'Maya Bennett'],
            ['Recipient', 'External account'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[110px_1fr] gap-4 px-5 py-4"
            >
              <dt className="text-slate-500">
                {label}
              </dt>
              <dd className="font-medium">
                {value}
              </dd>
            </div>
          ))}
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
      <OutlookShell
        senderName="Andrew Campbell"
        senderEmail="andrew.campbell@brightwellgroup.example"
        subject="Automatic Reply"
        date="Yesterday · 3:42 PM"
      >
        <p>Thank you for your message.</p>
        <p>
          I am away from my desk this afternoon
          preparing materials for tomorrow&apos;s
          Project Horizon review.
        </p>
        <p>
          For urgent Finance matters, please contact
          Maya Bennett.
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
      </OutlookShell>
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
          classification: displayClassification(
            review.evidence_id,
            review.classification
          ),
          notes: review.notes ?? '',
        };
      }

      return loaded;
    });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [continuing, setContinuing] =
    useState(false);
  const [continueError, setContinueError] =
    useState('');

  const filteredEvidence = useMemo(() => {
    if (activeCategory === 'All') {
      return evidence;
    }

    return evidence.filter(
      (item) => item.category === activeCategory
    );
  }, [activeCategory]);

  const reviewedCount = Object.keys(reviews).length;
  const canContinue = reviewedCount >= 7;

  async function saveReview(
    itemId: string,
    classification: Classification,
    notes: string
  ) {
    setSaving(true);
    setSaveError('');

    try {
      const valueForDatabase = storedClassification(
        itemId,
        classification
      );

      const { error: reviewError } = await supabase
        .from('mission_evidence_reviews')
        .upsert(
          {
            player_id: playerId,
            mission_id: 1,
            evidence_id: itemId,
            classification: valueForDatabase,
            notes: notes.trim(),
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict:
              'player_id,mission_id,evidence_id',
          }
        );

      if (reviewError) {
        throw new Error(reviewError.message);
      }

      const correct =
        ANSWER_KEY[itemId] === classification;

      const saved: Review = {
        classification,
        notes: notes.trim(),
        correct,
        feedback: FEEDBACK[itemId] ?? '',
      };

      setReviews((current) => ({
        ...current,
        [itemId]: saved,
      }));

      return saved;
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Unable to save evidence analysis.'
      );

      throw error;
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
      const { error: stageError } = await supabase
        .from('mission_attempts')
        .update({
          current_stage: 'theory',
        })
        .eq('player_id', playerId)
        .eq('mission_id', 1);

      if (stageError) {
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
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
              classify each item as Suspicious
              or Cleared.
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
                      item.category === category
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

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {filteredEvidence.map((item) => {
            const review = reviews[item.id];

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
                    {item.category === 'Emails' && '✉️'}
                    {item.category === 'Logs' && '📊'}
                    {item.category === 'Messages' && '💬'}
                    {item.category === 'Files' && '📁'}
                    {item.category === 'Other' && '🔎'}
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

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-950 bg-[#061019] p-5">
          <div>
            {!canContinue ? (
              <>
                <p className="font-bold">
                  Continue investigating.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Review at least 7 of the 10 evidence
                  files before building your theory.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-emerald-400">
                  Evidence requirement met.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  You may now proceed to build your
                  theory.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              disabled={!canContinue || continuing}
              onClick={() =>
                void continueToTheory()
              }
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

      {selectedEvidence && (
        <EvidenceModal
          key={selectedEvidence.id}
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
  ) => Promise<Review>;
  saving: boolean;
  saveError: string;
}) {
  const [classification, setClassification] =
    useState<Classification | null>(
      existingReview?.classification ?? null
    );

  const [notes, setNotes] = useState(
    existingReview?.notes ?? ''
  );

  const [result, setResult] =
    useState<Review | null>(
      existingReview?.correct !== undefined
        ? existingReview
        : null
    );

  const options: Classification[] = [
    'Suspicious',
    'Cleared',
  ];

  async function handleSave() {
    if (!classification || saving) {
      return;
    }

    try {
      const saved = await onSave(
        evidence.id,
        classification,
        notes
      );

      setResult(saved);
    } catch {
      // Parent already exposes the save error.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-cyan-800 bg-[#061019] shadow-2xl">
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
          <div className="bg-slate-100 p-6">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {evidence.type}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                {evidence.summary}
              </p>
            </div>

            <div>
              {evidence.detail}
            </div>
          </div>

          <aside className="p-6">
            {!result ? (
              <>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
                  Analyze This Item
                </p>

                <p className="mt-5 text-sm text-slate-400">
                  Mark as:
                </p>

                <div className="mt-3 grid gap-3">
                  {options.map((option) => (
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
                            : 'border-emerald-400 bg-emerald-950 text-emerald-300'
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
                </label>

                {saveError && (
                  <p className="mt-4 text-sm text-red-300">
                    {saveError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={!classification || saving}
                  onClick={() =>
                    void handleSave()
                  }
                  className="mt-6 w-full rounded-lg bg-cyan-400 px-5 py-3 font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {saving
                    ? 'Checking Analysis...'
                    : 'Save Analysis'}
                </button>
              </>
            ) : (
              <div>
                <div
                  className={`rounded-xl border p-5 ${
                    result.correct
                      ? 'border-emerald-500 bg-emerald-950/40'
                      : 'border-red-500 bg-red-950/40'
                  }`}
                >
                  <p
                    className={`text-2xl font-black ${
                      result.correct
                        ? 'text-emerald-300'
                        : 'text-red-300'
                    }`}
                  >
                    {result.correct
                      ? '✓ CORRECT'
                      : '✕ INCORRECT'}
                  </p>

                  <p className="mt-3 text-sm text-slate-300">
                    Your answer:{' '}
                    <strong>
                      {result.classification}
                    </strong>
                  </p>

                  {!result.correct && (
                    <p className="mt-2 text-sm text-slate-300">
                      Correct answer:{' '}
                      <strong>
                        {ANSWER_KEY[evidence.id]}
                      </strong>
                    </p>
                  )}

                  <p className="mt-4 text-sm leading-6 text-slate-200">
                    {result.feedback}
                  </p>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Your analysis has been saved.
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 w-full rounded-lg bg-cyan-400 px-5 py-3 font-black text-black"
                >
                  Continue Reviewing Evidence
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
