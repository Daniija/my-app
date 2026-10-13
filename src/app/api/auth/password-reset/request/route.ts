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

const GENERIC_MESSAGE =
  'If that username exists, your password reset request has been sent to the administrator.';

export async function POST(
  request: Request
) {
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

    if (
      profileError ||
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

    return NextResponse.json({
      ok: true,

      message:
        GENERIC_MESSAGE,
    });
  }
}