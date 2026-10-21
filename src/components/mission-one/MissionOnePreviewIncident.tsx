import Link from 'next/link';

type Props = {
  playerAlias: string;
};

export default function MissionOnePreviewIncident({
  playerAlias,
}: Props) {
  return (
    <main className="min-h-screen bg-[#02080d] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* ADMIN PREVIEW BANNER */}
        <div className="mb-5 rounded-xl border border-amber-600/60 bg-amber-950/20 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
                Admin Preview Mode
              </p>

              <p className="mt-1 text-sm text-slate-300">
                You are previewing Mission 01. No player progress or score
                will be saved.
              </p>
            </div>

            <Link
              href="/admin"
              className="rounded-lg border border-amber-700 px-4 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-950/40"
            >
              Exit Preview
            </Link>
          </div>
        </div>

        {/* OPERATIVE HEADER */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-950 bg-[#07141d] px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-400">
              Cyber Defence Unit
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Secure Operations Network
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Administrator
            </p>

            <p className="font-bold">{playerAlias}</p>
          </div>
        </header>

        <header className="mb-6 rounded-xl border border-red-950 bg-[#12090b] px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
            Priority Incident
          </p>

          <h1 className="mt-3 text-4xl font-black">
            09:17 Security Alert
          </h1>

          <p className="mt-2 text-slate-400">
            Suspicious account activity detected.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-cyan-950 bg-[#061019] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              Incident Summary
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Finance account compromise suspected
            </h2>

            <p className="mt-4 leading-7 text-slate-300">
              At 09:17, security monitoring detected access to a restricted
              folder using the account of Maya Bennett from the Finance
              Department.
            </p>

            <p className="mt-4 leading-7 text-slate-300">
              Maya has confirmed that she did not access the folder and did not
              intentionally sign in from an unfamiliar device.
            </p>

            <div className="mt-6 rounded-xl border border-red-900 bg-red-950/20 p-5">
              <p className="text-sm font-bold text-red-300">
                Your task:
              </p>

              <p className="mt-2 text-slate-300">
                Determine how the account was compromised, identify the most
                important evidence, reconstruct the attack, and recommend the
                correct containment response.
              </p>
            </div>

            <div className="mt-7">
              <Link
                href="/admin/missions/1/preview/evidence"
                className="rounded-lg bg-cyan-400 px-6 py-3 font-black text-black transition hover:bg-cyan-300"
              >
                Enter Evidence Room
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-cyan-950 bg-[#041018] p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              Case File
            </p>

            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Subject
                </dt>
                <dd className="mt-1 font-bold">
                  Maya Bennett
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Department
                </dt>
                <dd className="mt-1 font-bold">
                  Finance
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Alert Time
                </dt>
                <dd className="mt-1 font-bold">
                  09:17
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Evidence Files
                </dt>
                <dd className="mt-1 font-bold">
                  10
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase text-slate-500">
                  Operative
                </dt>
                <dd className="mt-1 font-bold">
                  {playerAlias}
                </dd>
              </div>
            </dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
