import { requireAdmin } from '@/lib/admin';

export default async function AdminProfilePage() {
  const { profile, user } = await requireAdmin();

  return (
    <main className="mx-auto max-w-4xl p-6">
      <span className="badge">ADMIN PROFILE</span>
      <h1 className="mt-3 text-4xl font-black">Administrator Identity</h1>
      <p className="muted mt-2">This profile controls privileged access to Mission Control.</p>

      <section className="card mt-6 p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Field label="Username" value={profile.username || 'Not set'} />
          <Field label="Public alias" value={profile.alias || 'Not set'} />
          <Field label="Department" value={profile.department || 'Not set'} />
          <Field label="Role" value={profile.role} />
          <Field label="Account status" value={profile.is_active ? 'Active' : 'Disabled'} />
          <Field label="Onboarding" value={profile.onboarding_complete ? 'Complete' : 'Incomplete'} />
          <Field label="Auth user ID" value={user.id} mono />
        </dl>
      </section>

      <section className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
        <h2 className="font-black">Security note</h2>
        <p className="muted mt-2 text-sm">Admin role changes are intentionally not available from this profile page. Promote or demote administrators only through the protected admin-management workflow or the server-side promotion script.</p>
      </section>
    </main>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="muted text-sm">{label}</dt><dd className={`mt-1 font-bold ${mono ? 'break-all font-mono text-sm' : ''}`}>{value}</dd></div>;
}
