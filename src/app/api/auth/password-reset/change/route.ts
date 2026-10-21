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

    const body =
      await request
        .json()
        .catch(() => null);

    const password =
      typeof body?.password ===
      'string'
        ? body.password
        : '';

    if (
      !validatePassword(
        password
      )
    ) {
      return NextResponse.json(
        {
          message:
            'Password must be 8–72 characters and contain at least one letter and one number.',
        },
        {
          status: 400,
        }
      );
    }

    const {
      error:
        passwordError,
    } =
      await supabase.auth.updateUser(
        {
          password,
        }
      );

    if (
      passwordError
    ) {
      console.error(
        '[CHANGE PASSWORD]',
        passwordError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'PASSWORD_CHANGE_FAILED',
        targetType: 'player',
        targetId: user.id,
        description: 'Unable to change password.',
        error: passwordError,
        context: { stage: 'update_auth_password' },
      });

      return NextResponse.json(
        {
          message:
            'Unable to change your password.',
        },
        {
          status: 500,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      error:
        profileError,
    } = await admin
      .from('profiles')
      .update({
        must_change_password:
          false,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        user.id
      );

    if (
      profileError
    ) {
      console.error(
        '[CHANGE PASSWORD] Unable to clear reset flag:',
        profileError
      );

      await writeErrorAuditLog({
        actorId: user.id,
        actorRole: 'player',
        action: 'PASSWORD_CHANGE_FAILED',
        targetType: 'player',
        targetId: user.id,
        description: 'Password changed, but the must_change_password flag could not be cleared.',
        error: profileError,
        context: { stage: 'clear_reset_flag' },
      });

      return NextResponse.json(
        {
          message:
            'Your password changed, but your account status could not be updated. Contact IT.',
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      '[CHANGE PASSWORD]',
      error
    );

    await writeErrorAuditLog({
      actorId: authedUserId,
      actorRole: authedUserId ? 'player' : null,
      action: 'PASSWORD_CHANGE_FAILED',
      targetType: 'player',
      targetId: authedUserId,
      description: 'Unexpected error while changing password.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      {
        message:
          'Unable to change your password.',
      },
      {
        status: 500,
      }
    );
  }
}