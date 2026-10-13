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