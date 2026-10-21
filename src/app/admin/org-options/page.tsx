import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import AdminOrgOptions from '@/components/admin/AdminOrgOptions';

export const dynamic = 'force-dynamic';

export default async function AdminOrgOptionsPage() {
  const { supabase } = await requireAdmin();

  const [{ data: departments }, { data: branches }] = await Promise.all([
    supabase
      .from('org_departments')
      .select('id, name, is_active, created_at')
      .order('name', { ascending: true }),
    supabase
      .from('org_branches')
      .select('id, name, is_active, created_at')
      .order('name', { ascending: true }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="badge">ADMIN</span>
          <h1 className="mt-3 text-3xl font-black">Departments &amp; Branches</h1>
          <p className="muted mt-2 max-w-2xl">
            Manage the option lists players choose from on the workgroup
            selection screen. These also group the Top Department and Top
            Branch leaderboards.
          </p>
        </div>

        <Link href="/admin" className="btn btn-secondary">
          ← Back to admin
        </Link>
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <AdminOrgOptions
          type="department"
          title="Departments"
          options={departments ?? []}
        />

        <AdminOrgOptions
          type="branch"
          title="Branches"
          options={branches ?? []}
        />
      </section>
    </main>
  );
}
