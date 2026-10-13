    import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validatePassword } from '@/lib/auth/username';

export async function POST(
  request: Request
) {
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