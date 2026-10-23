import { requireAdmin } from '@/lib/admin';
import ExecutiveVoiceConsole from '@/components/mission-three/ExecutiveVoiceConsole';

export const dynamic = 'force-dynamic';

export default async function MissionThreeAdminPreviewVoicePage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <ExecutiveVoiceConsole
          previewMode
          initialCompletedRounds={{}}
          initialRiskPercent={50}
        />
      </div>
    </main>
  );
}
