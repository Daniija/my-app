import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog, writeErrorAuditLog } from '@/lib/audit';
import {
  isValidUsername,
  normalizeUsername,
  usernameToAuthEmail,
} from '@/lib/auth/username';
import { isValidAlias, normalizeAlias } from '@/lib/auth/alias';

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

    const username = normalizeUsername(String(body?.username ?? ''));
    const alias = normalizeAlias(String(body?.alias ?? ''));

    if (!isValidUsername(username)) {
      return NextResponse.json(
        {
          message:
            'Username must be 3–20 characters and use only letters, numbers, underscores or hyphens.',
        },
        { status: 400 }
      );
    }

    if (!isValidAlias(alias)) {
      return NextResponse.json(
        { message: 'Alias must be 3–24 characters.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Department/branch are intentionally never written here — they are the
    // mandatory workgroup selection made once via /select-workgroup
    // (see /api/workgroup), and must not be clearable through profile edits.
    const { data: currentProfile, error: currentProfileError } = await admin
      .from('profiles')
      .select('username, alias, is_active')
      .eq('id', user.id)
      .single();

    if (currentProfileError || !currentProfile) {
      console.error(
        '[PROFILE] Unable to load current profile:',
        currentProfileError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'PROFILE_UPDATE_FAILED',
        targetType: 'player',
        targetId: user.id,
        description: 'Unable to load profile while saving a profile update.',
        error: currentProfileError,
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

    const usernameChanged =
      username !== normalizeUsername(currentProfile.username ?? '');

    const aliasChanged =
      alias.toLowerCase() !== (currentProfile.alias ?? '').toLowerCase();

    if (usernameChanged) {
      const { data: existingUsername } = await admin
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .neq('id', user.id)
        .maybeSingle();

      if (existingUsername) {
        return NextResponse.json(
          { message: 'That username is already taken.' },
          { status: 409 }
        );
      }
    }

    if (aliasChanged) {
      const { data: existingAlias } = await admin
        .from('profiles')
        .select('id')
        .ilike('alias', alias)
        .neq('id', user.id)
        .maybeSingle();

      if (existingAlias) {
        return NextResponse.json(
          { message: 'That cyber alias is already taken.' },
          { status: 409 }
        );
      }
    }

    // The username doubles as the private auth email's local part, so
    // changing it must keep auth.users.email and profiles.username in sync.
    if (usernameChanged) {
      let newEmail: string;

      try {
        newEmail = usernameToAuthEmail(username);
      } catch {
        return NextResponse.json(
          { message: 'Invalid username.' },
          { status: 400 }
        );
      }

      const { error: emailUpdateError } =
        await admin.auth.admin.updateUserById(user.id, {
          email: newEmail,
          email_confirm: true,
        });

      if (emailUpdateError) {
        console.error(
          '[PROFILE] Unable to update authentication email:',
          emailUpdateError
        );

        await writeErrorAuditLog({
          actorId: user.id,
          actorAlias: currentProfile.alias ?? currentProfile.username,
          actorRole: 'player',
          action: 'PROFILE_UPDATE_FAILED',
          targetType: 'player',
          targetId: user.id,
          description: 'Unable to update authentication email during a username change.',
          error: emailUpdateError,
          context: { stage: 'update_auth_email', newUsername: username },
        });

        const message = emailUpdateError.message
          .toLowerCase()
          .includes('already')
          ? 'That username is already taken.'
          : 'Unable to update your username. Please try again.';

        return NextResponse.json({ message }, { status: 409 });
      }
    }

    const { data: updatedProfile, error: updateError } = await admin
      .from('profiles')
      .update({
        username,
        alias,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('username, alias')
      .single();

    if (updateError || !updatedProfile) {
      console.error('[PROFILE] Profile update failed:', updateError);

      let rollbackError: unknown = null;

      // Keep auth email and profile username from diverging if the
      // profile write failed after the email was already changed.
      if (usernameChanged) {
        try {
          const rollbackEmail = usernameToAuthEmail(
            normalizeUsername(currentProfile.username ?? '')
          );

          await admin.auth.admin.updateUserById(user.id, {
            email: rollbackEmail,
          });
        } catch (caughtRollbackError) {
          rollbackError = caughtRollbackError;

          console.error(
            '[PROFILE] Unable to roll back authentication email:',
            caughtRollbackError
          );
        }
      }

      await writeErrorAuditLog({
        actorId: user.id,
        actorAlias: currentProfile.alias ?? currentProfile.username,
        actorRole: 'player',
        action: 'PROFILE_UPDATE_FAILED',
        targetType: 'player',
        targetId: user.id,
        description: 'Unable to save profile update.',
        error: updateError ?? new Error('Profile update returned no row.'),
        context: {
          stage: 'update_profile',
          usernameChanged,
          aliasChanged,
          emailRollbackAttempted: usernameChanged,
          emailRollbackFailed: rollbackError
            ? String(rollbackError)
            : null,
        },
      });

      const message =
        updateError?.code === '23505'
          ? 'That username or alias is already taken.'
          : 'Unable to update your profile.';

      return NextResponse.json({ message }, { status: 500 });
    }

    await writeAuditLog({
      actorId: user.id,
      actorAlias: updatedProfile.alias ?? updatedProfile.username,
      actorRole: 'player',
      action: 'PROFILE_UPDATED',
      targetType: 'player',
      targetId: user.id,
      description: `${updatedProfile.alias ?? updatedProfile.username} updated their profile.`,
      metadata: {
        username: updatedProfile.username,
        alias: updatedProfile.alias,
      },
    });

    return NextResponse.json({ ok: true, profile: updatedProfile });
  } catch (error) {
    console.error('[PROFILE] Unexpected error:', error);

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'PROFILE_UPDATE_FAILED',
      targetType: 'player',
      targetId: authedUserId,
      description: 'Unexpected error while updating a profile.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      { message: 'Unable to update your profile.' },
      { status: 500 }
    );
  }
}
