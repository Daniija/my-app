import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const Schema = z.object({ attemptId: z.string().uuid(), progress: z.record(z.string(), z.unknown()) });

export async function POST(req: Request) {
  try {
    const input = Schema.parse(await req.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Session expired. Sign in again to continue.' }, { status: 401 });
    const { error } = await supabase.from('mission_progress').upsert({ attempt_id: input.attemptId, player_id: user.id, mission_id: 1, progress: input.progress, updated_at: new Date().toISOString() }, { onConflict: 'attempt_id' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const ref = crypto.randomUUID().slice(0, 8).toUpperCase();
    console.error('progress-save', ref, err);
    return NextResponse.json({ error: `Save interrupted. Reference GAME-${ref}` }, { status: 400 });
  }
}
