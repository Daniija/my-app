import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import WorkgroupSelectForm from '@/components/WorkgroupSelectForm';
import SignOutButton from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function SelectWorkgroupPage() {
  const { supabase, user } = await requireUser();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active, onboarding_complete, work_location_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <section className="card p-6">
          <span className="badge">ACCOUNT SETUP</span>
          <h1 className="mt-4 text-2xl font-black">Unable to load your profile</h1>
          <p className="muted mt-2">
            Your account is signed in, but your player profile could not be
            loaded. Please try again. If the problem continues, contact IT.
          </p>
        </section>
      </main>
    );
  }

  if (profile.role === 'admin') redirect('/admin');
  if (!profile.onboarding_complete) redirect('/onboarding');
  if (profile.work_location_type) redirect('/dashboard');

  const [{ data: departments }, { data: branches }] = await Promise.all([
    supabase
      .from('org_departments')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('org_branches')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <section className="card p-6">
        <span className="badge">ONE MORE STEP</span>

        <h1 className="mt-4 text-3xl font-black">
          Which team are you competing for?
        </h1>

        <p className="muted mt-3 leading-6">
          Choose Department or Branch, then pick your specific team from the
          list. This powers the new Top Department and Top Branch
          leaderboards — you can&apos;t continue until you pick one.
        </p>

        <div className="mt-6">
          <WorkgroupSelectForm
            departments={(departments ?? []).map((d) => d.name)}
            branches={(branches ?? []).map((b) => b.name)}
          />
        </div>

        <p className="muted mt-6 text-center text-xs">
          Not ready to choose? Signing out keeps your progress and you&apos;ll
          be asked again next time you log in.
        </p>

        <div className="mt-3 flex justify-center">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
