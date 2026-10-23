import HackerTransmission from '@/components/mission-three/HackerTransmission';
import { requireMissionThreeStage } from '@/lib/missions/mission-three-stage-page';

export default async function MissionThreeTransmissionPage() {
  const { supabase, attempt } = await requireMissionThreeStage(
    'transmission'
  );

  // Reached directly from the briefing's client-side navigation (no
  // API call in between) -- this is the one self-advance Mission 03
  // performs outside the advance_mission_three_stage() RPC, mirroring
  // how the "video" stage used to do it before "transmission" was
  // inserted ahead of it.
  if (
    attempt.current_stage === null ||
    attempt.current_stage === 'briefing'
  ) {
    const { error } = await supabase
      .from('mission_attempts')
      .update({ current_stage: 'transmission' })
      .eq('id', attempt.id)
      .eq('current_stage', attempt.current_stage ?? 'briefing');

    if (error) {
      console.error(
        '[MISSION 03 TRANSMISSION] Unable to advance to transmission stage:',
        error
      );
    }
  }

  return <HackerTransmission previewMode={false} />;
}
