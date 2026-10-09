export type Evidence = {
  id: string;
  type: 'email' | 'log' | 'message' | 'calendar' | 'browser' | 'qr' | 'cloud' | 'other';
  title: string;
  subtitle: string;
  body: string[];
  detail?: string;
};

export const week1Evidence: Evidence[] = [
  {
    id: 'E01', type: 'email', title: 'HR Benefits Email', subtitle: '08:03 · Human Resources',
    body: ['Updated health and benefits information is now available on the staff portal.', 'No action is required unless you wish to update your information.'],
    detail: 'Link destination: staff.company.com/benefits'
  },
  {
    id: 'E02', type: 'email', title: 'Project Horizon Document', subtitle: '08:32 · Daniel Carter',
    body: ['Following yesterday’s leadership meeting, the revised Project Horizon document is now available.', 'Please review the update before the 11:30 AM meeting and confirm your figures.'],
    detail: 'Displayed link: sharepoint.company.com/projects/horizon\nActual destination: company-projects-login.com/horizon\nSender: daniel.carter@company-documents.com'
  },
  {
    id: 'E03', type: 'other', title: 'MFA Notification', subtitle: '08:48 · Microsoft 365',
    body: ['Authentication request approved.', 'Location: Kingston, Jamaica · Device: Chrome — Windows'],
    detail: 'The approval occurred shortly after the suspicious document link was opened.'
  },
  {
    id: 'E04', type: 'log', title: 'Login Activity', subtitle: '07:52–09:17 · Account log',
    body: ['07:52 MAYA-PC-04 — Success', '08:11 MAYA-PC-04 — Success', '08:49 WIN-91K2 — Success', '09:03 WIN-91K2 — Success', '09:17 WIN-91K2 — Success'],
    detail: 'WIN-91K2 is not a registered Finance device.'
  },
  {
    id: 'E05', type: 'message', title: 'Teams Conversation', subtitle: '08:19 · Internal message',
    body: ['Colleague: “Maya, are you still bringing the Finance estimates to the 11:30 Project Horizon meeting?”', 'Maya: “Yes, I’m finalising them now.”'],
    detail: 'The conversation is legitimate, but confirms the meeting was real.'
  },
  {
    id: 'E06', type: 'calendar', title: 'Calendar Invitation', subtitle: '11:30 · Conference Room B',
    body: ['Project Horizon — Finance Review', 'Participants include Maya Bennett, Daniel Carter, Mr Campbell and Procurement.'],
    detail: 'The invitation itself is legitimate.'
  },
  {
    id: 'E07', type: 'browser', title: 'Browser History', subtitle: '08:05–08:51 · Maya-PC-04',
    body: ['08:05 staff.company.com', '08:14 outlook.office.com', '08:33 company-projects-login.com', '08:36 login.microsoftonline.com', '08:51 finance.company.com'],
    detail: 'The unusual domain was visited one minute after the Project Horizon email.'
  },
  {
    id: 'E08', type: 'qr', title: 'Security Awareness QR Poster', subtitle: 'Office corridor',
    body: ['“Scan to review updated security guidance.”', 'QR destination: security.company.com/awareness'],
    detail: 'The QR code is legitimate and is a deliberate decoy.'
  },
  {
    id: 'E09', type: 'cloud', title: 'External File Share', subtitle: '09:24 · Finance Strategy 2026',
    body: ['A file was shared externally from Maya Bennett’s account.', 'Recipient: project.review@externalmail.example'],
    detail: 'This happened after the account compromise and is an effect, not the initial entry point.'
  },
  {
    id: 'E10', type: 'email', title: 'Supervisor Out-of-Office', subtitle: 'Configured previous day',
    body: ['“For urgent Project Horizon matters, contact Maya Bennett in Finance.”'],
    detail: 'Legitimate context that may explain how an attacker learned about Maya’s role.'
  }
];

export const attackMethods = [
  ['phishing', 'Phishing email'], ['qr_phishing', 'QR phishing'], ['password_spraying', 'Password spraying'],
  ['usb', 'Malicious USB device'], ['insider', 'Insider attack'], ['mfa_fatigue', 'MFA fatigue'],
  ['malware_attachment', 'Malware attachment'], ['physical_access', 'Physical access']
] as const;

export const entryPoints = [
  ['fake_login_page', 'Maya opened a fake document login page'], ['malicious_qr', 'Maya scanned a malicious QR code'],
  ['guessed_password', 'Maya’s password was guessed'], ['malware', 'Maya installed malware'],
  ['coworker', 'A coworker used Maya’s computer'], ['server_hack', 'The Finance server was hacked directly']
] as const;

export const sequenceCards = [
  ['email', 'Phishing email received'], ['link', 'Fake document link opened'], ['credentials', 'Credentials entered'],
  ['mfa', 'MFA request approved'], ['account_access', 'Attacker accessed account']
] as const;

export const containmentOptions = [
  ['revoke_sessions', 'Revoke Maya’s active sessions'], ['reset_credentials', 'Force a credential reset'],
  ['preserve_logs', 'Preserve relevant security logs'], ['disable_account', 'Disable or restrict the compromised account'],
  ['delete_email', 'Delete all of Maya’s email'], ['shutdown_network', 'Shut down the entire company network'],
  ['accuse_maya', 'Publicly announce that Maya caused the breach'], ['wait', 'Wait until the attacker logs in again']
] as const;
