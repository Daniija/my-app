import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,username,alias,department,role,is_active,onboarding_complete')
    .eq('id', user.id)
    .single();

  if (error || !profile || profile.role !== 'admin' || !profile.is_active) {
    redirect('/dashboard');
  }

  return { supabase, user, profile };
}