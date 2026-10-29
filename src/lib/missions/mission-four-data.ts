// Mission 4 ("Zero Hour") real content: the 30-question Cyber Smart
// Challenge bank, folded directly into the mission's existing
// stage/challenge engine rather than kept as a separate feature.
// All 30 are 'multiple_choice' challenges (matching the source
// material's format exactly -- questions/options/answers
// transcribed as provided, nothing fabricated) distributed across
// the 4 stages. Mission 4 keeps its own existing mechanics: one
// whole-mission 12-minute countdown (no per-question sub-timer) and
// its existing 3000-point budget (700/700/800/800 across
// TRIAGE/TRACE/CONTAIN/DISARM), with each stage's points divided
// evenly across however many of its questions there are.

import type { MissionFourChallenge } from './mission-four-challenge-engine';
import {
  MISSION_FOUR_STAGE_ORDER,
  MISSION_FOUR_STAGE_POINTS,
  type MissionFourStageName,
} from './mission-four-scoring';

export type MissionFourStageDefinition = {
  id: MissionFourStageName;
  number: number;
  title: string;
  codename: string;
  description: string;
  challenges: MissionFourChallenge[];
  completionBonus: number;
};

function mc(
  id: number,
  stage: MissionFourStageName,
  prompt: string,
  options: [string, string, string, string],
  correctOptionId: 'a' | 'b' | 'c' | 'd',
  points: number
): MissionFourChallenge {
  return {
    id: `q${id}`,
    stage,
    type: 'multiple_choice',
    title: `Question ${id}`,
    prompt,
    options: [
      { id: 'a', label: options[0] },
      { id: 'b', label: options[1] },
      { id: 'c', label: options[2] },
      { id: 'd', label: options[3] },
    ],
    correctOptionId,
    points,
  };
}

const TRIAGE_CHALLENGES: MissionFourChallenge[] = [
  mc(1, 'triage', 'What is cybersecurity?', [
    'Making computers work faster',
    'Protecting computers, networks, and information from digital threats',
    'Creating social media accounts',
    'Installing new computer games',
  ], 'b', 88),
  mc(2, 'triage', 'What is the main purpose of multi-factor authentication (MFA)?', [
    'To make internet connections faster',
    'To remove the need for passwords on every website',
    'To provide an additional layer of account security',
    'To prevent a phone from running out of battery',
  ], 'c', 88),
  mc(3, 'triage', 'Which of the following is the strongest password?', [
    '12345678',
    'Password123',
    'Michelle2026',
    'River!Mango82#Cloud',
  ], 'd', 88),
  mc(4, 'triage', 'You receive an email from your bank saying your account has been suspended. What is the safest action?', [
    'Click the link immediately',
    'Reply with your banking password',
    'Contact the bank using its official website, app, or phone number',
    'Forward the email to your friends',
  ], 'c', 88),
  mc(5, 'triage', 'Which information should you NEVER share with someone claiming to be from your bank?', [
    'Your favourite colour',
    'Your banking PIN or password',
    'Your favourite food',
    'Your preferred banking location',
  ], 'b', 87),
  mc(6, 'triage', 'What is phishing?', [
    'Using fake messages or websites to trick people into giving sensitive information',
    'Sending a normal birthday greeting',
    'Updating an antivirus program',
    'Connecting a phone to Wi-Fi',
  ], 'a', 87),
  mc(7, 'triage', 'You receive a WhatsApp message saying you have won J$500,000 but must pay a fee to collect it. What should you do?', [
    'Send the fee immediately',
    'Share your banking details',
    'Treat the message as suspicious and verify independently',
    'Forward the offer to everyone',
  ], 'c', 87),
  mc(8, 'triage', 'What is ransomware?', [
    'A program that repairs a damaged computer',
    'Malicious software that locks or encrypts files and demands payment',
    'A tool used to improve internet speed',
    'A type of online banking service',
  ], 'b', 87),
];

const TRACE_CHALLENGES: MissionFourChallenge[] = [
  mc(9, 'trace', 'What is the safest way to protect your smartphone from unauthorized access?', [
    'Leave it unlocked',
    'Share your PIN with friends',
    'Turn off all security settings',
    'Use a strong screen lock, fingerprint, or secure passcode',
  ], 'd', 88),
  mc(10, 'trace', 'A video call appears to show your manager requesting an urgent money transfer. Why should you verify the request?', [
    'Every video call is fraudulent',
    'Artificial intelligence can be used to imitate someone\'s face or voice',
    'Video calls cannot be used for business',
    'All money transfers are illegal',
  ], 'b', 88),
  mc(11, 'trace', 'Why should you regularly update your phone or computer software?', [
    'To fix security weaknesses and improve protection',
    'To automatically increase your mobile data',
    'To change your telephone number',
    'To remove every virus permanently',
  ], 'a', 88),
  mc(12, 'trace', 'What is social engineering in cybersecurity?', [
    'Building a social media platform',
    'Creating stronger internet connections',
    'Manipulating people into revealing information or performing unsafe actions',
    'Designing websites for engineers',
  ], 'c', 88),
  mc(13, 'trace', 'You receive a one-time verification code that you did not request. What should you do?', [
    'Share the code with the person who calls',
    'Post it on WhatsApp',
    'Forward it to your contacts',
    'Keep it private and check your account security',
  ], 'd', 87),
  mc(14, 'trace', 'What is a business email compromise (BEC) attack?', [
    'A scam that impersonates a business contact to request money or sensitive information',
    'A company changing its official email address',
    'A computer failing to receive messages',
    'An employee sending a meeting invitation',
  ], 'a', 87),
  mc(15, 'trace', 'What should you do before accepting a friend request from someone you do not know on social media?', [
    'Accept immediately',
    'Review the profile and consider whether the person is trustworthy',
    'Send the person your address',
    'Give the person access to your account',
  ], 'b', 87),
  mc(16, 'trace', 'What is credential stuffing?', [
    'Saving passwords in a secure manager',
    'Creating multiple legitimate user accounts',
    'Using stolen username and password combinations to try accessing other accounts',
    'Encrypting files before sending them',
  ], 'c', 87),
];

const CONTAIN_CHALLENGES: MissionFourChallenge[] = [
  mc(17, 'contain', 'Which action is safest when using a shared or public computer?', [
    'Save your passwords in the browser',
    'Leave your email account open',
    'Allow strangers to access your files',
    'Sign out of your accounts when finished',
  ], 'd', 115),
  mc(18, 'contain', 'Why can public Wi-Fi networks be risky?', [
    'They always contain computer viruses',
    'Attackers may create fake hotspots or attempt to intercept unprotected information',
    'They automatically reveal everyone\'s bank PIN',
    'They cannot support secure websites',
  ], 'b', 115),
  mc(19, 'contain', 'Someone calls claiming to be from your bank and asks for your PIN. What should you do?', [
    'Refuse to share it and contact your bank through an official channel',
    'Give the PIN because the caller sounds professional',
    'Send the PIN by text message',
    'Ask the caller to share it with your family',
  ], 'a', 114),
  mc(20, 'contain', 'What is the principle of least privilege in cybersecurity?', [
    'Giving all employees administrator access',
    'Sharing the same password across a department',
    'Giving users only the access necessary to perform their duties',
    'Removing security controls for experienced employees',
  ], 'c', 114),
  mc(21, 'contain', 'Which of the following is a warning sign of an online scam?', [
    'A company publishing its opening hours',
    'A message demanding immediate payment to avoid a threat',
    'A friend sending a normal greeting',
    'A school publishing a timetable',
  ], 'b', 114),
  mc(22, 'contain', 'What should you do if you accidentally send confidential company information to the wrong person?', [
    'Delete your own copy and say nothing',
    'Wait until someone complains',
    'Post an explanation on social media',
    'Report the incident promptly using the organization\'s approved procedure',
  ], 'd', 114),
  mc(23, 'contain', 'What is two-step verification used for?', [
    'Adding an extra security check when accessing an account',
    'Making a phone charge faster',
    'Opening two websites simultaneously',
    'Increasing the number of followers on social media',
  ], 'a', 114),
];

const DISARM_CHALLENGES: MissionFourChallenge[] = [
  mc(24, 'disarm', 'A QR code on a poster promises free mobile credit. What potential danger should you consider?', [
    'QR codes cannot be used in scams',
    'All QR codes automatically install viruses',
    'The QR code may direct you to a fraudulent website',
    'QR codes are always safer than website links',
  ], 'c', 115),
  mc(25, 'disarm', 'Why should you avoid using the same password for all your online accounts?', [
    'It makes websites load more slowly',
    'If one password is stolen, criminals may access several accounts',
    'It prevents your phone from receiving messages',
    'It increases internet costs',
  ], 'b', 115),
  mc(26, 'disarm', 'What is a zero-day vulnerability?', [
    'A security issue that has already been permanently fixed',
    'A password that expires after 24 hours',
    'A computer virus that works only at midnight',
    'A software security weakness for which a fix is not yet available when it is exploited or disclosed',
  ], 'd', 114),
  mc(27, 'disarm', 'A stranger sends you a link promising a free smartphone. What should you do?', [
    'Verify the offer through a trusted source before opening the link',
    'Click immediately before the offer expires',
    'Enter your banking information to claim it',
    'Send the link to every group chat',
  ], 'a', 114),
  mc(28, 'disarm', 'What is the best way to protect important files against ransomware?', [
    'Keep only one copy of each file',
    'Turn off automatic security updates',
    'Maintain regular, tested backups, including an isolated or offline copy',
    'Share copies of all files publicly',
  ], 'c', 114),
  mc(29, 'disarm', 'What is the safest response when a message claims to be from a relative who urgently needs money?', [
    'Send the money immediately',
    'Verify the request by contacting the relative through a trusted number',
    'Share your bank password with the sender',
    'Forward the message to all your contacts',
  ], 'b', 114),
  mc(30, 'disarm', 'What should an employee do first when they suspect a cyberattack at work?', [
    'Ignore the situation until the next day',
    'Delete all files immediately',
    'Announce the incident on social media',
    'Report it promptly through approved channels and follow the incident response instructions',
  ], 'd', 114),
];

export const MISSION_FOUR_STAGES: MissionFourStageDefinition[] = [
  {
    id: 'triage',
    number: 1,
    title: 'Triage',
    codename: 'TRIAGE',
    description: 'Initial assessment of the detected payload.',
    completionBonus: 30,
    challenges: TRIAGE_CHALLENGES,
  },
  {
    id: 'trace',
    number: 2,
    title: 'Trace',
    codename: 'TRACE',
    description: 'Tracing the intrusion back to its source.',
    completionBonus: 30,
    challenges: TRACE_CHALLENGES,
  },
  {
    id: 'contain',
    number: 3,
    title: 'Contain',
    codename: 'CONTAIN',
    description: 'Containing the attack before it spreads.',
    completionBonus: 30,
    challenges: CONTAIN_CHALLENGES,
  },
  {
    id: 'disarm',
    number: 4,
    title: 'Disarm',
    codename: 'DISARM',
    description: 'The final decision before detonation.',
    completionBonus: 30,
    challenges: DISARM_CHALLENGES,
  },
];

// Sanity check: every stage's challenge points must sum to that
// stage's advertised budget in mission-four-scoring.ts -- catches a
// transcription/arithmetic mistake at import time rather than at a
// player's expense, same pattern as MISSION_FOUR_STAGE_POINTS' own
// self-check.
for (const stage of MISSION_FOUR_STAGES) {
  const sum = stage.challenges.reduce((total, c) => total + c.points, 0);
  const expected = MISSION_FOUR_STAGE_POINTS[stage.id];

  if (sum !== expected) {
    throw new Error(
      `Mission 4 stage "${stage.id}" challenges sum to ${sum}, expected ${expected}.`
    );
  }
}

export function getMissionFourStage(
  stage: MissionFourStageName
): MissionFourStageDefinition {
  const found = MISSION_FOUR_STAGES.find((candidate) => candidate.id === stage);

  if (!found) {
    throw new Error(`Unknown Mission 4 stage: ${stage}`);
  }

  return found;
}

export function getMissionFourChallenge(
  stage: MissionFourStageName,
  challengeId: string
): MissionFourChallenge | undefined {
  return getMissionFourStage(stage).challenges.find((c) => c.id === challengeId);
}

// Re-exported here so UI components only need to import from one
// place for both stage content and stage order/points.
export { MISSION_FOUR_STAGE_ORDER, MISSION_FOUR_STAGE_POINTS };
