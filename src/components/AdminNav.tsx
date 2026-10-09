import Link from 'next/link';
import SignOutButton from '@/components/SignOutButton';

export default function AdminNav({ alias }: { alias?: string | null }) {
  return (
    <header className="border-b border-[var(--line)] bg-[#07141d]/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-cyan-300">CYBER DEFENCE UNIT</p>
          <p className="font-black">Admin Mission Control</p>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link className="btn btn-secondary" href="/admin">
            Overview
          </Link>
          <Link className="btn btn-secondary" href="/admin/players">
            Players
          </Link>
          <Link className="btn btn-secondary" href="/admin/audit">
            Audit
          </Link>
          <Link className="btn btn-secondary" href="/admin/profile">
            Profile
          </Link>
          <Link className="btn btn-secondary" href="/leaderboard">
            Leaderboard
          </Link>

          <span className="hidden text-[var(--muted)] sm:inline">
            {alias || 'Admin'}
          </span>

          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
