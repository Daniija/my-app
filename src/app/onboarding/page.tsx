import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import ProfileSetup from '@/app/dashboard/ProfileSetup';

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username,onboarding_complete,work_location_type')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <section className="card p-6">
          <span className="badge">ACCOUNT SETUP</span>
          <h1 className="mt-4 text-2xl font-black">Unable to load your profile</h1>
          <p className="muted mt-2">
            Your account is signed in, but the player profile could not be loaded. Please try again. If the problem continues, contact IT.
          </p>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <section className="card p-6">
          <span className="badge">ACCOUNT SETUP</span>
          <h1 className="mt-4 text-2xl font-black">Player profile not found</h1>
          <p className="muted mt-2">
            Your login account exists, but the matching game profile is missing. Contact IT and provide your username so the profile can be repaired.
          </p>
        </section>
      </main>
    );
  }

  if (profile.onboarding_complete) {
    redirect(
      profile.work_location_type ? '/dashboard' : '/select-workgroup'
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <ProfileSetup username={profile.username ?? 'player'} />
    </main>
  );
}
