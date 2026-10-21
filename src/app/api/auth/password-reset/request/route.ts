import {
  NextResponse,
} from 'next/server';

import {
  createAdminClient,
} from '@/lib/supabase/admin';

import {
  isValidUsername,
  normalizeUsername,
} from '@/lib/auth/username';

import {
  writeErrorAuditLog,
} from '@/lib/audit';

const GENERIC_MESSAGE =
  'If that username exists, your password reset request has been sent to the administrator.';

export async function POST(
  request: Request
) {
  let attemptedUsername: string | null = null;

  try {
    const body =
      await request
        .json()
        .catch(() => null);

    const rawUsername =
      typeof body?.username ===
      'string'
        ? body.username
        : '';

    const username =
      normalizeUsername(
        rawUsername
      );

    attemptedUsername = username;

    /*
     * Always use the same public
     * response so people cannot use
     * this page to discover valid
     * usernames.
     */
    if (
      !isValidUsername(
        username
      )
    ) {
      return NextResponse.json({
        ok: true,
        message:
          GENERIC_MESSAGE,
      });
    }

    const admin =
      createAdminClient();

    const {
      data: profile,
      error: profileError,
    } = await admin
      .from('profiles')
      .select(`
        id,
        role,
        is_active
      `)
      .eq(
        'username',
        username
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        '[PASSWORD RESET] Profile lookup failed:',
        profileError
      );

      await writeErrorAuditLog({
        actorAlias: username,
        action: 'PASSWORD_RESET_REQUEST_FAILED',
        description: `Profile lookup failed while requesting a password reset for "${username}".`,
        error: profileError,
        context: { stage: 'profile_lookup' },
      });

      // Still return the generic response — this endpoint intentionally
      // never reveals whether a username exists.
      return NextResponse.json({
        ok: true,
        message:
          GENERIC_MESSAGE,
      });
    }

    if (
      !profile ||
      profile.role !==
        'player' ||
      !profile.is_active
    ) {
      return NextResponse.json({
        ok: true,
        message:
          GENERIC_MESSAGE,
      });
    }

    const {
      error: insertError,
    } = await admin
      .from(
        'password_reset_requests'
      )
      .insert({
        player_id:
          profile.id,

        status:
          'pending',
      });

    /*
     * 23505 means this player
     * already has a pending request.
     * That is fine.
     */
    if (
      insertError &&
      insertError.code !==
        '23505'
    ) {
      console.error(
        '[PASSWORD RESET] Unable to create request:',
        insertError
      );

      await writeErrorAuditLog({
        actorId: profile.id,
        action: 'PASSWORD_RESET_REQUEST_FAILED',
        targetType: 'player',
        targetId: profile.id,
        description: `Unable to create a password reset request for username "${username}".`,
        error: insertError,
        context: { stage: 'insert_request' },
      });
    }

    return NextResponse.json({
      ok: true,

      message:
        GENERIC_MESSAGE,
    });
  } catch (error) {
    console.error(
      '[PASSWORD RESET]',
      error
    );

    await writeErrorAuditLog({
      actorAlias: attemptedUsername,
      action: 'PASSWORD_RESET_REQUEST_FAILED',
      description: 'Unexpected error while requesting a password reset.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json({
      ok: true,

      message:
        GENERIC_MESSAGE,
    });
  }
}