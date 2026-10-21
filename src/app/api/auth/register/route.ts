import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeErrorAuditLog } from '@/lib/audit';
import {
  isValidUsername,
  normalizeUsername,
  usernameToAuthEmail,
  validatePassword,
} from '@/lib/auth/username';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let createdUserId: string | null = null;

  try {
    const body = await request.json().catch(() => null);

    const username = normalizeUsername(
      String(body?.username ?? '')
    );

    const password = String(body?.password ?? '');

    // Validate username
    if (!isValidUsername(username)) {
      return NextResponse.json(
        {
          code: 'INVALID_USERNAME',
          message:
            'Username must be 3–20 characters and use only letters, numbers, underscores or hyphens.',
        },
        { status: 400 }
      );
    }

    // Validate password
    if (!validatePassword(password)) {
      return NextResponse.json(
        {
          code: 'INVALID_PASSWORD',
          message:
            'Password must be 8–72 characters and include at least one letter and one number.',
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    /*
     * Check whether username already exists.
     */
    const {
      data: existingProfile,
      error: profileLookupError,
    } = await admin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (profileLookupError) {
      console.error(
        '[REGISTER] Username lookup failed:',
        profileLookupError
      );

      await writeErrorAuditLog({
        actorAlias: username,
        action: 'REGISTRATION_FAILED',
        description: `Username lookup failed while registering "${username}".`,
        error: profileLookupError,
        context: { stage: 'username_lookup', username },
      });

      return NextResponse.json(
        {
          code: 'PROFILE_LOOKUP_FAILED',
          message:
            'Unable to check the username. Please contact IT.',
        },
        { status: 500 }
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          code: 'USERNAME_TAKEN',
          message: 'That username is already taken.',
        },
        { status: 409 }
      );
    }

    /*
     * Supabase Auth requires an email-style identifier.
     * Users never see this address and no email is sent.
     */
    const email = usernameToAuthEmail(username);

    /*
     * Create Supabase Auth account.
     */
    const {
      data: created,
      error: createError,
    } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,

      user_metadata: {
        username,
      },

      app_metadata: {
        app_role: 'player',
      },
    });

    if (createError) {
      console.error(
        '[REGISTER] Auth user creation failed:',
        createError
      );

      const lowerMessage =
        createError.message.toLowerCase();

      if (
        lowerMessage.includes('already') ||
        lowerMessage.includes('registered')
      ) {
        return NextResponse.json(
          {
            code: 'USERNAME_TAKEN',
            message: 'That username is already taken.',
          },
          { status: 409 }
        );
      }

      await writeErrorAuditLog({
        actorAlias: username,
        action: 'REGISTRATION_FAILED',
        description: `Auth account creation failed while registering "${username}".`,
        error: createError,
        context: { stage: 'auth_user_creation', username },
      });

      return NextResponse.json(
        {
          code: 'AUTH_USER_CREATION_FAILED',
          message:
            'Supabase could not create the authentication account.',
          detail:
            process.env.NODE_ENV === 'development'
              ? createError.message
              : undefined,
        },
        { status: 500 }
      );
    }

    if (!created.user) {
      return NextResponse.json(
        {
          code: 'AUTH_USER_MISSING',
          message:
            'Authentication account was not returned by Supabase.',
        },
        { status: 500 }
      );
    }

    createdUserId = created.user.id;

    /*
     * Create application profile.
     */
    const { error: profileError } = await admin
      .from('profiles')
      .insert({
        id: created.user.id,
        email,
        username,
        alias: null,
        department: null,
        role: 'player',
        is_active: true,
        onboarding_complete: false,
      });

    if (profileError) {
      console.error(
        '[REGISTER] Profile creation failed:',
        profileError
      );

      // Remove the Auth user so we don't leave
      // a half-created account.
      await admin.auth.admin.deleteUser(
        created.user.id
      );

      createdUserId = null;

      if (profileError.code === '23505') {
        return NextResponse.json(
          {
            code: 'USERNAME_TAKEN',
            message: 'That username is already taken.',
          },
          { status: 409 }
        );
      }

      await writeErrorAuditLog({
        actorAlias: username,
        action: 'REGISTRATION_FAILED',
        description: `Profile creation failed while registering "${username}" (auth account was rolled back).`,
        error: profileError,
        context: { stage: 'profile_creation', username },
      });

      return NextResponse.json(
        {
          code: 'PROFILE_CREATION_FAILED',
          message:
            'The account was created but the player profile could not be configured.',
          detail:
            process.env.NODE_ENV === 'development'
              ? profileError.message
              : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        username,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      '[REGISTER] Unexpected registration error:',
      error
    );

    let rollbackFailed = false;

    if (createdUserId) {
      try {
        const admin = createAdminClient();

        await admin.auth.admin.deleteUser(
          createdUserId
        );
      } catch (rollbackError) {
        rollbackFailed = true;

        console.error(
          '[REGISTER] Rollback failed:',
          rollbackError
        );
      }
    }

    await writeErrorAuditLog({
      action: 'REGISTRATION_FAILED',
      description: 'Unexpected error during registration.',
      error,
      context: {
        stage: 'unexpected',
        rollbackAttempted: Boolean(createdUserId),
        rollbackFailed,
      },
    });

    return NextResponse.json(
      {
        code: 'REGISTRATION_FAILED',
        message:
          'Account creation was interrupted. Please try again.',
        detail:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}