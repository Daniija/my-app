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

export type AuditErrorEvent = {
  actorId?: string | null;
  actorAlias?: string | null;
  actorRole?: string | null;

  // e.g. 'WORKGROUP_SELECTION_FAILED' — the admin audit UI automatically
  // flags any action containing "FAILED" in red.
  action: string;

  targetType?: string | null;
  targetId?: string | null;

  description: string;

  // The caught error — message (and stack, when available) are recorded
  // so a failure can be diagnosed from the admin Audit Log without server
  // console access.
  error: unknown;

  context?: Record<string, unknown>;
};

export async function writeErrorAuditLog(
  event: AuditErrorEvent
) {
  const errorMessage =
    event.error instanceof Error
      ? event.error.message
      : String(event.error);

  const errorStack =
    event.error instanceof Error
      ? event.error.stack
      : undefined;

  await writeAuditLog({
    actorId: event.actorId,
    actorAlias: event.actorAlias,
    actorRole: event.actorRole,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    description: event.description,
    metadata: {
      ...event.context,
      errorMessage,
      ...(errorStack ? { errorStack } : {}),
    },
  });
}
