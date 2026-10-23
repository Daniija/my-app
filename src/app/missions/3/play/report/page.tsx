import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import MissionThreeReport from '@/components/mission-three/MissionThreeReport';
import type { MissionThreeStage } from '@/lib/missions/mission-three-scoring';

export default async function MissionThreeReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,role,is_active,onboarding_complete,work_location_type')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  if (!profile.is_active) {
    redirect('/login');
  }

  if (profile.role === 'admin') {
    redirect('/admin');
  }

  if (!profile.onboarding_complete) {
    redirect('/onboarding');
  }

  if (!profile.work_location_type) {
    redirect('/select-workgroup');
  }

  const { data: attempt } = await supabase
    .from('mission_attempts')
    .select('id, status, current_stage')
    .eq('player_id', user.id)
    .eq('mission_id', 3)
    .maybeSingle();

  // The report only exists once Mission 03 has actually been
  // completed -- send anyone else back to the briefing/resume flow.
  if (
    !attempt ||
    (attempt.status !== 'submitted' && attempt.current_stage !== 'report')
  ) {
    redirect('/missions/3/play');
  }

  const [{ data: progressRow }, { data: scoreRow }] = await Promise.all([
    supabase
      .from('mission_progress')
      .select('progress')
      .eq('attempt_id', attempt.id)
      .maybeSingle(),

    supabase
      .from('mission_scores')
      .select('total_score')
      .eq('player_id', user.id)
      .eq('mission_id', 3)
      .maybeSingle(),
  ]);

  const progress =
    (progressRow?.progress as Record<string, { points?: number }>) ?? {};

  const stageEarned: Partial<Record<MissionThreeStage, number>> = {
    voice: progress.voice?.points ?? 0,
    email: progress.email?.points ?? 0,
    verification: progress.verification?.points ?? 0,
    final: progress.final?.points ?? 0,
  };

  const totalScore = scoreRow?.total_score ?? 0;

  return (
    <main className="min-h-screen bg-[#060205] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <MissionThreeReport
          stageEarned={stageEarned}
          totalScore={totalScore}
        />
      </div>
    </main>
  );
}
