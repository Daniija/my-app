import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { writeErrorAuditLog } from '@/lib/audit';

const Schema = z.object({
  attemptId: z.string().uuid(),
  attackMethod: z.string().min(1),
  entryPoint: z.string().min(1),
  sequence: z.array(z.string()).length(5),
  strongest: z.array(z.string()).length(3),
  reasoning: z.array(z.string()).max(4),
  containment: z.array(z.string()).length(4),
  hints: z.number().int().min(0).max(3)
});

export async function POST(req: Request) {
  let authedUserId: string | null = null;

  try {
    const input = Schema.parse(await req.json());
    if (new Set(input.sequence).size !== 5 || new Set(input.strongest).size !== 3 || new Set(input.containment).size !== 4) {
      return NextResponse.json({ error: 'Duplicate choices are not allowed.' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Session expired. Your progress is preserved.' }, { status: 401 });
    authedUserId = user.id;
    const { data, error } = await supabase.rpc('submit_week1_attempt', {
      p_attempt_id: input.attemptId,
      p_submission: {
        attackMethod: input.attackMethod,
        entryPoint: input.entryPoint,
        sequence: input.sequence,
        strongest: input.strongest,
        reasoning: input.reasoning,
        containment: input.containment,
        hints: input.hints
      }
    });
    if (error) throw error;
    const score = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ score });
  } catch (err) {
    const ref = crypto.randomUUID().slice(0, 8).toUpperCase();
    console.error('mission-submit', ref, err);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'MISSION_SUBMIT_FAILED',
      targetType: 'mission',
      description: `Mission 01 (legacy) submission failed. Reference GAME-${ref}.`,
      error: err,
      context: { stage: 'unexpected', reference: `GAME-${ref}` },
    });

    return NextResponse.json({ error: `Submission could not be completed. Your attempt remains safe. Reference GAME-${ref}` }, { status: 400 });
  }
}
