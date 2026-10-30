import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import MissionFourReport from '@/components/mission-four/MissionFourReport';
import type { MissionFourStageName } from '@/lib/missions/mission-four-scoring';

export default async function MissionFourReportPage() {
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
    .eq('mission_id', 4)
    .maybeSingle();

  // The report only exists once Mission 04 has actually concluded
  // (success or failure) -- send anyone else back to the briefing/
  // resume flow.
  if (!attempt || (attempt.status !== 'submitted' && attempt.current_stage !== 'report')) {
    redirect('/missions/4/play');
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
      .eq('mission_id', 4)
      .maybeSingle(),
  ]);

  const progress =
    (progressRow?.progress as Record<string, { points?: number }>) ?? {};

  const report = progress.report as { outcome?: string } | undefined;
  const outcome: 'success' | 'failed' = report?.outcome === 'failed' ? 'failed' : 'success';

  const stageEarned: Partial<Record<MissionFourStageName, number>> = {
    triage: progress.triage?.points ?? 0,
    trace: progress.trace?.points ?? 0,
    contain: progress.contain?.points ?? 0,
    disarm: progress.disarm?.points ?? 0,
  };

  const totalScore = scoreRow?.total_score ?? 0;

  const disarmResult = progress.disarm as
    | { remainingSecondsAtCompletion?: number; missionCompletionBonus?: number }
    | undefined;

  const remainingSeconds =
    outcome === 'success' ? disarmResult?.remainingSecondsAtCompletion ?? null : 0;

  // Kept separate from stageEarned.disarm (which is capped at this
  // stage's own 800-point budget) -- this is a mission-wide "finished
  // with time to spare" reward, not part of DISARM's own challenge
  // score, so it gets its own line on the report instead of inflating
  // DISARM's number past its cap.
  const timeBonusPoints =
    outcome === 'success' ? disarmResult?.missionCompletionBonus ?? 0 : 0;

  return (
    <main className="min-h-screen bg-[#02050a] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <MissionFourReport
          outcome={outcome}
          stageEarned={stageEarned}
          totalScore={totalScore}
          remainingSeconds={remainingSeconds}
          timeBonusPoints={timeBonusPoints}
        />
      </div>
    </main>
  );
}
