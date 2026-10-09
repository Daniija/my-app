import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cyber Defence Unit',
  description: 'Cybersecurity Month interactive mission platform'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
