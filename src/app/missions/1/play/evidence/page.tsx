import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionOneEvidenceRoom from '@/components/mission-one/MissionOneEvidenceRoom'

export default async function MissionOneEvidencePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      alias,
      role,
      is_active,
      onboarding_complete
    `)
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect('/login');
  }

  if (profile.role === 'admin') {
    redirect('/admin');
  }

  if (!profile.onboarding_complete) {
    redirect('/onboarding');
  }

  const { data: attempt } = await supabase
    .from('mission_attempts')
    .select(`
      id,
      status,
      current_stage,
      started_at,
      completed_at
    `)
    .eq('player_id', user.id)
    .eq('mission_id', 1)
    .maybeSingle();

  if (!attempt) {
    redirect('/missions/1');
  }

  if (attempt.status === 'submitted') {
    redirect('/missions/1');
  }

  const { data: savedReviews } = await supabase
  .from('mission_evidence_reviews')
  .select(`
    evidence_id,
    classification,
    notes
  `)
  .eq('player_id', user.id)
  .eq('mission_id', 1);

  return (
    <MissionOneEvidenceRoom
  playerAlias={profile.alias ?? 'Agent'}
  playerId={user.id}
  initialReviews={savedReviews ?? []}
/>
  );
}