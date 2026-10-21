import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
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

type AdminProfile = {
  id: string;
  username: string | null;
  alias: string | null;
  role: string;
  is_active: boolean;
};

export type AdminApiGuard =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: User;
      profile: AdminProfile;
    }
  | { ok: false; response: NextResponse };

// Admin guard for route handlers. Unlike `requireAdmin`, which redirects
// (page-only), this returns a ready-made JSON error response so callers can
// `if (!guard.ok) return guard.response;` and keep API error shapes uniform.
export async function requireAdminApi(): Promise<AdminApiGuard> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,username,alias,role,is_active')
    .eq('id', user.id)
    .single();

  if (error || !profile || profile.role !== 'admin' || !profile.is_active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Administrator access required.' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, supabase, user, profile };
}