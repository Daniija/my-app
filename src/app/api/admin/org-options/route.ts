import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog, writeErrorAuditLog } from '@/lib/audit';

type OptionType = 'department' | 'branch';
type OptionAction = 'add' | 'remove';

const allowedTypes: OptionType[] = ['department', 'branch'];
const allowedActions: OptionAction[] = ['add', 'remove'];

function tableFor(type: OptionType) {
  return type === 'department' ? 'org_departments' : 'org_branches';
}

export async function POST(request: Request) {
  // Tracked outside the try block so the catch-all handler below can still
  // attach actor context even if something throws before the guard resolves.
  let actorId: string | null = null;
  let actorAlias: string | null = null;

  try {
    const guard = await requireAdminApi();
    if (!guard.ok) return guard.response;

    const { profile: adminProfile } = guard;
    actorId = adminProfile.id;
    actorAlias = adminProfile.alias ?? adminProfile.username;

    const body = await request.json().catch(() => null);

    const type = body?.type as OptionType | undefined;
    const action = body?.action as OptionAction | undefined;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const id = typeof body?.id === 'string' ? body.id : '';

    if (!type || !allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid option type.' },
        { status: 400 }
      );
    }

    if (!action || !allowedActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid option action.' },
        { status: 400 }
      );
    }

    const table = tableFor(type);
    const admin = createAdminClient();

    if (action === 'add') {
      if (!name) {
        return NextResponse.json(
          { error: 'Name is required.' },
          { status: 400 }
        );
      }

      if (name.length > 80) {
        return NextResponse.json(
          { error: 'Name must be 80 characters or fewer.' },
          { status: 400 }
        );
      }

      const { data: inserted, error: insertError } = await admin
        .from(table)
        .insert({ name })
        .select('id, name')
        .single();

      if (insertError) {
        const message =
          insertError.code === '23505'
            ? `That ${type} already exists.`
            : insertError.message || `Unable to add the ${type}.`;

        await writeErrorAuditLog({
          actorId: adminProfile.id,
          actorAlias: adminProfile.alias ?? adminProfile.username,
          actorRole: 'admin',
          action: 'ORG_OPTION_ADD_FAILED',
          targetType: type,
          description: `Unable to add ${type}: ${name}.`,
          error: insertError,
          context: { type, name },
        });

        return NextResponse.json({ error: message }, { status: 400 });
      }

      await writeAuditLog({
        actorId: adminProfile.id,
        actorAlias: adminProfile.alias ?? adminProfile.username,
        actorRole: 'admin',
        action: 'ORG_OPTION_ADDED',
        targetType: type,
        targetId: inserted.id,
        description: `Added ${type}: ${inserted.name}.`,
        metadata: { type, name: inserted.name },
      });

      return NextResponse.json({ ok: true, option: inserted });
    }

    // action === 'remove'
    if (!id) {
      return NextResponse.json(
        { error: 'An option id is required.' },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await admin
      .from(table)
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: `That ${type} could not be found.` },
        { status: 404 }
      );
    }

    const { error: deleteError } = await admin
      .from(table)
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error(
        '[ADMIN ORG OPTIONS] Delete failed:',
        deleteError
      );

      await writeErrorAuditLog({
        actorId: adminProfile.id,
        actorAlias: adminProfile.alias ?? adminProfile.username,
        actorRole: 'admin',
        action: 'ORG_OPTION_REMOVE_FAILED',
        targetType: type,
        targetId: existing.id,
        description: `Unable to remove ${type}: ${existing.name}.`,
        error: deleteError,
        context: { type, name: existing.name },
      });

      return NextResponse.json(
        { error: deleteError.message || `Unable to remove the ${type}.` },
        { status: 500 }
      );
    }

    await writeAuditLog({
      actorId: adminProfile.id,
      actorAlias: adminProfile.alias ?? adminProfile.username,
      actorRole: 'admin',
      action: 'ORG_OPTION_REMOVED',
      targetType: type,
      targetId: existing.id,
      description: `Removed ${type}: ${existing.name}.`,
      metadata: { type, name: existing.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ADMIN ORG OPTIONS] Unexpected error:', error);

    await writeErrorAuditLog({
      actorId,
      actorAlias,
      actorRole: actorId ? 'admin' : null,
      action: 'ORG_OPTION_ACTION_FAILED',
      description: 'Unexpected error while managing departments/branches.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update options.',
      },
      { status: 500 }
    );
  }
}
