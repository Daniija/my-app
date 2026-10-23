import './globals.css';
import type { Metadata } from 'next';

import PresenceHeartbeat from '@/components/PresenceHeartbeat';

export const metadata: Metadata = {
  title: 'Cyber Defence Unit',
  description: 'Cybersecurity Month interactive mission platform'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PresenceHeartbeat />
        {children}
      </body>
    </html>
  );
}
