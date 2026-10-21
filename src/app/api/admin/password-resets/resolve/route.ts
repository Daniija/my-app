    import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validatePassword } from '@/lib/auth/username';
import { writeErrorAuditLog } from '@/lib/audit';

export async function POST(
  request: Request
) {
  let authedUserId: string | null = null;

  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          message:
            'Authentication required.',
        },
        {
          status: 401,
        }
      );
    }

    authedUserId = user.id;

    const {
      data: adminProfile,
      error: adminProfileError,
    } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        is_active
      `)
      .eq('id', user.id)
      .single();

    if (
      adminProfileError ||
      !adminProfile ||
      adminProfile.role !==
        'admin' ||
      !adminProfile.is_active
    ) {
      return NextResponse.json(
        {
          message:
            'Administrator access required.',
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request
        .json()
        .catch(() => null);

    const requestId =
      typeof body?.requestId ===
      'string'
        ? body.requestId
        : '';

    const temporaryPassword =
      typeof body?.temporaryPassword ===
      'string'
        ? body.temporaryPassword
        : '';

    if (
      !requestId ||
      !validatePassword(
        temporaryPassword
      )
    ) {
      return NextResponse.json(
        {
          message:
            'Temporary password must be 8–72 characters and contain at least one letter and one number.',
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data: resetRequest,
      error: requestError,
    } = await admin
      .from(
        'password_reset_requests'
      )
      .select(`
        id,
        player_id,
        status
      `)
      .eq(
        'id',
        requestId
      )
      .eq(
        'status',
        'pending'
      )
      .maybeSingle();

    if (
      requestError ||
      !resetRequest
    ) {
      return NextResponse.json(
        {
          message:
            'This reset request is no longer pending.',
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: player,
      error: playerError,
    } = await admin
      .from('profiles')
      .select(`
        id,
        role,
        is_active
      `)
      .eq(
        'id',
        resetRequest.player_id
      )
      .single();

    if (
      playerError ||
      !player ||
      player.role !==
        'player' ||
      !player.is_active
    ) {
      return NextResponse.json(
        {
          message:
            'Player account is unavailable.',
        },
        {
          status: 400,
        }
      );
    }

    const {
      error: authError,
    } =
      await admin.auth.admin.updateUserById(
        player.id,
        {
          password:
            temporaryPassword,
        }
      );

    if (authError) {
      console.error(
        '[PASSWORD RESET] Unable to update Auth password:',
        authError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'admin',
        action: 'PASSWORD_RESET_RESOLVE_FAILED',
        targetType: 'player',
        targetId: player.id,
        description: `Unable to update the Auth password for player ${player.id}.`,
        error: authError,
        context: { stage: 'update_auth_password', requestId },
      });

      return NextResponse.json(
        {
          message:
            'Unable to update the player password.',
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: profileError,
    } = await admin
      .from('profiles')
      .update({
        must_change_password:
          true,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        player.id
      );

    if (profileError) {
      console.error(
        '[PASSWORD RESET] Unable to set must_change_password:',
        profileError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'admin',
        action: 'PASSWORD_RESET_RESOLVE_FAILED',
        targetType: 'player',
        targetId: player.id,
        description: `Password changed for player ${player.id}, but must_change_password could not be set.`,
        error: profileError,
        context: { stage: 'set_must_change_password', requestId },
      });

      return NextResponse.json(
        {
          message:
            'The password was changed, but the forced password-change flag could not be saved.',
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: resolveError,
    } = await admin
      .from(
        'password_reset_requests'
      )
      .update({
        status: 'resolved',
        resolved_at:
          new Date().toISOString(),
        resolved_by:
          user.id,
      })
      .eq(
        'id',
        requestId
      );

    if (resolveError) {
      console.error(
        '[PASSWORD RESET] Unable to mark request resolved:',
        resolveError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'admin',
        action: 'PASSWORD_RESET_RESOLVE_FAILED',
        targetType: 'player',
        targetId: player.id,
        description: `Password was reset for player ${player.id}, but the request could not be marked resolved.`,
        error: resolveError,
        context: { stage: 'mark_resolved', requestId },
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        'Temporary password set successfully.',
    });
  } catch (error) {
    console.error(
      '[PASSWORD RESET]',
      error
    );

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'admin' : null,
      action: 'PASSWORD_RESET_RESOLVE_FAILED',
      description: 'Unexpected error while resolving a password reset request.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      {
        message:
          'Unable to reset the password.',
      },
      {
        status: 500,
      }
    );
  }
}