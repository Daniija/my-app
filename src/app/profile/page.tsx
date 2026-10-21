import Link from 'next/link';
import { redirect } from 'next/navigation';

import { requireUser } from '@/lib/auth';
import ProfileEditForm from '@/components/ProfileEditForm';

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'username, alias, department, branch, work_location_type, role, is_active, onboarding_complete'
    )
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    redirect('/login');
  }

  if (!profile.is_active) {
    redirect('/login');
  }

  if (profile.role === 'admin') {
    redirect('/admin/profile');
  }

  if (!profile.onboarding_complete) {
    redirect('/onboarding');
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge">PLAYER PROFILE</span>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Your Cyber Identity
          </h1>

          <p className="muted mt-2">
            Update your login name and public alias.
          </p>
        </div>

        <Link href="/dashboard" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      <section className="card mt-6 p-6">
        <ProfileEditForm
          username={profile.username ?? ''}
          alias={profile.alias ?? ''}
        />
      </section>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-black">Workgroup</h2>

        <p className="muted mt-2 text-sm">
          {profile.work_location_type === 'hq' &&
            `Department: ${profile.department ?? '—'}`}
          {profile.work_location_type === 'branch' &&
            `Branch: ${profile.branch ?? '—'}`}
          {!profile.work_location_type &&
            'Not selected yet — you will be asked to choose on your next login.'}
        </p>

        <p className="muted mt-2 text-xs">
          This is set once during login and is not editable here. Contact an
          administrator if it needs to be corrected.
        </p>
      </section>
    </main>
  );
}
