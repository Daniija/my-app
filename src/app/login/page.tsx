import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/dashboard');

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <div className="grid items-center gap-7 md:grid-cols-[1.15fr_.85fr]">
        <section>
          <span className="badge">CYBERSECURITY MONTH 2026</span>
          <h1 className="mt-4 text-5xl font-black tracking-tight">CYBER DEFENCE UNIT</h1>
          <p className="mt-3 text-xl font-bold text-[var(--accent)]">Securing the Next 250</p>
          <p className="muted mt-5 max-w-2xl leading-7">
            Four Fridays. One connected cyber incident. Investigate evidence, survive social engineering,
            contain the final attack, and compete on a month-long live leaderboard.
          </p>
          <div className="card mt-6 p-4">
            <p className="font-bold">MISSION 01 — THE BREACH</p>
            <p className="muted mt-1 text-sm">Friday, October 9 · 9:00 AM Jamaica time</p>
          </div>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
