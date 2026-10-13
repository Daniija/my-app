import Link from 'next/link';

import ForgotPasswordForm from '@/components/auth/ForgetPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <section className="card p-6 sm:p-8">
        <span className="badge">
          ACCOUNT RECOVERY
        </span>

        <h1 className="mt-4 text-3xl font-black">
          Forgot your password?
        </h1>

        <p className="muted mt-3 leading-7">
          Enter your game username.
          A password reset request will
          be sent to the Cyber Defence
          Unit administrator.
        </p>

        <ForgotPasswordForm />

        <div className="mt-6">
          <Link
            href="/login"
            className="text-sm font-bold text-[var(--accent)] hover:underline"
          >
            ← Return to login
          </Link>
        </div>
      </section>
    </main>
  );
}