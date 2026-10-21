import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog, writeErrorAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Tracked outside the try block so the catch-all handler below can still
  // attach actor context even if something throws before `user` is in scope.
  let authedUserId: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    authedUserId = user?.id ?? null;

    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    const workLocationType = body?.workLocationType;
    const value = typeof body?.value === 'string' ? body.value.trim() : '';

    if (
      workLocationType !== 'hq' &&
      workLocationType !== 'branch'
    ) {
      return NextResponse.json(
        { message: 'Choose Department or Branch.' },
        { status: 400 }
      );
    }

    if (!value) {
      return NextResponse.json(
        { message: 'Choose an option from the list.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: currentProfile, error: profileError } = await admin
      .from('profiles')
      .select('id, alias, is_active, role')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      console.error(
        '[WORKGROUP] Unable to load profile:',
        profileError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'WORKGROUP_SELECTION_FAILED',
        targetType: 'player',
        targetId: user.id,
        description: 'Unable to load profile while saving a workgroup selection.',
        error: profileError,
        context: { stage: 'load_profile' },
      });

      return NextResponse.json(
        { message: 'Unable to load your profile.' },
        { status: 500 }
      );
    }

    if (!currentProfile.is_active) {
      return NextResponse.json(
        { message: 'Your account is not active.' },
        { status: 403 }
      );
    }

    if (currentProfile.role === 'admin') {
      return NextResponse.json(
        { message: 'Administrator accounts do not select a workgroup.' },
        { status: 403 }
      );
    }

    // The value must come from the admin-managed list — never free text —
    // so the two new leaderboards group players consistently.
    const optionsTable =
      workLocationType === 'hq' ? 'org_departments' : 'org_branches';

    const { data: matchedOption, error: optionError } = await admin
      .from(optionsTable)
      .select('name')
      .ilike('name', value)
      .eq('is_active', true)
      .maybeSingle();

    if (optionError) {
      console.error(
        '[WORKGROUP] Unable to verify option:',
        optionError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorAlias: currentProfile.alias,
        actorRole: 'player',
        action: 'WORKGROUP_SELECTION_FAILED',
        targetType: 'player',
        targetId: user.id,
        description: `Unable to verify the ${workLocationType === 'hq' ? 'department' : 'branch'} option "${value}".`,
        error: optionError,
        context: { stage: 'verify_option', workLocationType, value },
      });

      return NextResponse.json(
        { message: 'Unable to verify that option.' },
        { status: 500 }
      );
    }

    if (!matchedOption) {
      return NextResponse.json(
        { message: 'That option is no longer available. Please pick again.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({
        work_location_type: workLocationType,
        department: workLocationType === 'hq' ? matchedOption.name : null,
        branch: workLocationType === 'branch' ? matchedOption.name : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(
        '[WORKGROUP] Profile update failed:',
        updateError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorAlias: currentProfile.alias,
        actorRole: 'player',
        action: 'WORKGROUP_SELECTION_FAILED',
        targetType: 'player',
        targetId: user.id,
        description: `Unable to save ${currentProfile.alias ?? 'a player'}'s workgroup selection.`,
        error: updateError,
        context: { stage: 'update_profile', workLocationType, value: matchedOption.name },
      });

      return NextResponse.json(
        { message: 'Unable to save your selection.' },
        { status: 500 }
      );
    }

    await writeAuditLog({
      actorId: user.id,
      actorAlias: currentProfile.alias,
      actorRole: 'player',
      action: 'WORKGROUP_SELECTED',
      targetType: 'player',
      targetId: user.id,
      description: `${currentProfile.alias ?? 'A player'} selected ${
        workLocationType === 'hq' ? 'department' : 'branch'
      }: ${matchedOption.name}.`,
      metadata: {
        workLocationType,
        value: matchedOption.name,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[WORKGROUP] Unexpected error:', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'WORKGROUP_SELECTION_FAILED',
      targetType: 'player',
      targetId: authedUserId,
      description: 'Unexpected error while saving a workgroup selection.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      { message: 'Unable to save your selection.' },
      { status: 500 }
    );
  }
}
