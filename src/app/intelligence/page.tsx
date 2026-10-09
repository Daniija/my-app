import { requireUser } from '@/lib/auth'; import IntelligenceVault from '@/components/IntelligenceVault';
export default async function Page(){ await requireUser(); return <main className="mx-auto max-w-5xl p-6"><IntelligenceVault/></main>; }
