import { createAdminClient } from '@/lib/supabase/admin';

export type AuditEvent = {
  actorId?: string | null;
  actorAlias?: string | null;
  actorRole?: string | null;

  action: string;

  targetType?: string | null;
  targetId?: string | null;

  description: string;

  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(
  event: AuditEvent
) {
  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from('audit_logs')
      .insert({
        actor_id: event.actorId ?? null,
        actor_alias:
          event.actorAlias ?? null,
        actor_role:
          event.actorRole ?? null,

        action: event.action,

        target_type:
          event.targetType ?? null,
        target_id:
          event.targetId ?? null,

        description:
          event.description,

        metadata:
          event.metadata ?? {},
      });

    if (error) {
      console.error(
        '[AUDIT] Unable to record event:',
        error
      );
    }
  } catch (error) {
    // Audit logging should never crash the main action.
    console.error(
      '[AUDIT] Unexpected logging error:',
      error
    );
  }
}
