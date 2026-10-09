import type { ReactNode } from 'react';
import AdminNav from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <>
      <AdminNav alias={profile.alias} />
      {children}
    </>
  );
}
