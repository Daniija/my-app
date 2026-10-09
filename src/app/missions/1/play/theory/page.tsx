import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MissionOneTheory from '@/components/mission-one/MissionOneTheory'

export default async function MissionOneTheoryPage() {
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

  const { data: attempt } = await supabase
    .from('mission_attempts')
    .select(`
      id,
      status,
      current_stage
    `)
    .eq('player_id', user.id)
    .eq('mission_id', 1)
    .maybeSingle();

  if (!attempt) {
    redirect('/missions/1');
  }

  const { data: reviews } = await supabase
    .from('mission_evidence_reviews')
    .select(`
      evidence_id,
      classification,
      notes
    `)
    .eq('player_id', user.id)
    .eq('mission_id', 1);

  if ((reviews ?? []).length < 7) {
    redirect('/missions/1/play/evidence');
  }

  const { data: existingTheory } = await supabase
    .from('mission_theories')
    .select(`
      attack_method,
      initial_compromise,
      strongest_evidence,
      attack_sequence,
      explanation
    `)
    .eq('player_id', user.id)
    .eq('mission_id', 1)
    .maybeSingle();

  return (
    <MissionOneTheory
      playerId={user.id}
      playerAlias={profile.alias ?? 'Agent'}
      initialTheory={existingTheory}
    />
  );
}