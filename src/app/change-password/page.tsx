import { redirect } from 'next/navigation';

import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import { createClient } from '@/lib/supabase/server';

export default async function ChangePasswordPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const {
    data: profile,
  } = await supabase
    .from('profiles')
    .select(`
      alias,
      must_change_password
    `)
    .eq(
      'id',
      user.id
    )
    .single();

  if (
    profile &&
    !profile
      .must_change_password
  ) {
    redirect(
      '/dashboard'
    );
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <section className="card p-6 sm:p-8">
        <span className="badge">
          ACCOUNT SECURITY
        </span>

        <h1 className="mt-4 text-3xl font-black">
          Create a new password
        </h1>

        <p className="muted mt-3 leading-7">
          {profile?.alias
            ? `${profile.alias}, your temporary password worked.`
            : 'Your temporary password worked.'}{' '}
          You must create a new
          password before
          continuing.
        </p>

        <ChangePasswordForm />
      </section>
    </main>
  );
}