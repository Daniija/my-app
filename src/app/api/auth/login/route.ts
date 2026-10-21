import {
  NextResponse,
} from 'next/server';

import {
  createClient,
} from '@/lib/supabase/server';

import {
  createAdminClient,
} from '@/lib/supabase/admin';

import {
  usernameToAuthEmail,
} from '@/lib/auth/username';

import {
  writeErrorAuditLog,
} from '@/lib/audit';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';


// ==================================
// HELPERS
// ==================================

function normalizeName(
  value: string
) {
  return value
    .trim()
    .replace(
      /\s+/g,
      ' '
    );
}


function isValidName(
  value: string
) {
  const clean =
    normalizeName(
      value
    );

  if (
    clean.length < 3 ||
    clean.length > 40
  ) {
    return false;
  }

  return /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*\.?$/.test(
    clean
  );
}


function invalidCredentials() {
  return NextResponse.json(
    {
      ok: false,

      code:
        'INVALID_LOGIN',

      message:
        'Name or password is incorrect.',
    },
    {
      status: 401,
    }
  );
}


// ==================================
// LOGIN
// ==================================

export async function POST(
  request: Request
) {
  // Tracked outside the try block so the catch-all handler below can still
  // attach context even if something throws before `name` is in scope.
  let attemptedName: string | null = null;

  try {
    // ----------------------------------
    // READ REQUEST
    // ----------------------------------

    const body =
      await request
        .json()
        .catch(
          () => null
        );

    const submittedName =
      typeof body?.name ===
      'string'
        ? body.name
        : '';

    const password =
      typeof body?.password ===
      'string'
        ? body.password
        : '';

    const name =
      normalizeName(
        submittedName
      );

    attemptedName = name;


    // ----------------------------------
    // BASIC VALIDATION
    // ----------------------------------

    if (
      !isValidName(
        name
      )
    ) {
      return NextResponse.json(
        {
          ok: false,

          code:
            'INVALID_NAME',

          message:
            'Enter your name in the format Paul H.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      !password
    ) {
      return NextResponse.json(
        {
          ok: false,

          code:
            'PASSWORD_REQUIRED',

          message:
            'Enter your password.',
        },
        {
          status: 400,
        }
      );
    }


    // ==================================
    // FIND PLAYER PROFILE
    //
    // Use service-role client because
    // the player is not authenticated yet.
    // ==================================

    const admin =
      createAdminClient();

    const {
      data:
        profiles,

      error:
        lookupError,
    } =
      await admin
        .from(
          'profiles'
        )
        .select(`
          id,
          name,
          username,
          alias,
          department,
          role,
          is_active,
          onboarding_complete,
          must_change_password,
          work_location_type
        `)
        .ilike(
          'name',
          name
        )
        .limit(
          2
        );


    if (
      lookupError
    ) {
      console.error(
        '[LOGIN] Unable to look up player profile:',
        lookupError
      );

      await writeErrorAuditLog({
        actorAlias: name,
        action: 'LOGIN_FAILED',
        description: `Profile lookup failed while logging in as "${name}".`,
        error: lookupError,
        context: { stage: 'profile_lookup' },
      });

      return NextResponse.json(
        {
          ok: false,

          code:
            'PROFILE_LOOKUP_FAILED',

          message:
            'We could not sign you in. Please try again.',
        },
        {
          status: 500,
        }
      );
    }


    // ----------------------------------
    // NO MATCH
    // ----------------------------------

    if (
      !profiles ||
      profiles.length ===
        0
    ) {
      return invalidCredentials();
    }


    // ----------------------------------
    // DUPLICATE NAME SAFEGUARD
    //
    // Normally the unique index on
    // lower(name) prevents this.
    // ----------------------------------

    if (
      profiles.length >
      1
    ) {
      console.error(
        '[LOGIN] Duplicate player name detected:',
        name
      );

      await writeErrorAuditLog({
        actorAlias: name,
        action: 'LOGIN_FAILED',
        description: `More than one profile matched the name "${name}".`,
        error: new Error(`Duplicate name: ${profiles.length} profiles matched "${name}".`),
        context: { stage: 'duplicate_name', matchCount: profiles.length },
      });

      return NextResponse.json(
        {
          ok: false,

          code:
            'DUPLICATE_NAME',

          message:
            'More than one account uses this name. Contact IT so the account can be corrected.',
        },
        {
          status: 409,
        }
      );
    }


    const profile =
      profiles[0];


    // ----------------------------------
    // ACCOUNT MUST BE ACTIVE
    //
    // Keep the public error generic.
    // ----------------------------------

    if (
      !profile.is_active
    ) {
      return invalidCredentials();
    }


    // ----------------------------------
    // PRIVATE USERNAME MUST EXIST
    // ----------------------------------

    if (
      !profile.username
    ) {
      console.error(
        '[LOGIN] Profile is missing its private username:',
        profile.id
      );

      await writeErrorAuditLog({
        actorId: profile.id,
        actorAlias: profile.alias ?? name,
        actorRole: profile.role ?? 'player',
        action: 'LOGIN_FAILED',
        targetType: 'player',
        targetId: profile.id,
        description: `Profile ${profile.alias ?? name} is missing its private username.`,
        error: new Error('Profile is missing its private username.'),
        context: { stage: 'missing_username' },
      });

      return NextResponse.json(
        {
          ok: false,

          code:
            'ACCOUNT_CONFIGURATION_ERROR',

          message:
            'Your account needs attention. Please contact IT.',
        },
        {
          status: 500,
        }
      );
    }


    // ==================================
    // CONVERT PRIVATE USERNAME
    // TO SYNTHETIC AUTH EMAIL
    // ==================================

    let email:
      string;

    try {
      email =
        usernameToAuthEmail(
          profile.username
        );
    } catch (
      error
    ) {
      console.error(
        '[LOGIN] Unable to generate authentication email:',
        error
      );

      await writeErrorAuditLog({
        actorId: profile.id,
        actorAlias: profile.alias ?? name,
        actorRole: profile.role ?? 'player',
        action: 'LOGIN_FAILED',
        targetType: 'player',
        targetId: profile.id,
        description: `Unable to generate an authentication email for ${profile.alias ?? name}.`,
        error,
        context: { stage: 'generate_auth_email' },
      });

      return NextResponse.json(
        {
          ok: false,

          code:
            'ACCOUNT_CONFIGURATION_ERROR',

          message:
            'Your account needs attention. Please contact IT.',
        },
        {
          status: 500,
        }
      );
    }


    // ==================================
    // SIGN IN
    //
    // Use the normal server Supabase
    // client so the auth session cookies
    // are written to the browser.
    // ==================================

    const supabase =
      await createClient();

    const {
      data:
        authData,

      error:
        authError,
    } =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        });


    if (
      authError ||
      !authData.user
    ) {
      if (
        authError
      ) {
        console.warn(
          '[LOGIN] Authentication failed for profile:',
          profile.id
        );
      }

      return invalidCredentials();
    }


    // ==================================
    // VERIFY AUTH USER MATCHES PROFILE
    // ==================================

    if (
      authData.user.id !==
      profile.id
    ) {
      console.error(
        '[LOGIN] Authentication/profile ID mismatch.'
      );

      await writeErrorAuditLog({
        actorId: profile.id,
        actorAlias: profile.alias ?? name,
        actorRole: profile.role ?? 'player',
        action: 'LOGIN_FAILED',
        targetType: 'player',
        targetId: profile.id,
        description: `Authentication/profile ID mismatch for ${profile.alias ?? name}.`,
        error: new Error('Authentication user ID did not match the profile ID.'),
        context: {
          stage: 'id_mismatch',
          authUserId: authData.user.id,
        },
      });

      await supabase.auth
        .signOut();

      return NextResponse.json(
        {
          ok: false,

          code:
            'ACCOUNT_MISMATCH',

          message:
            'Your account could not be verified. Please contact IT.',
        },
        {
          status: 500,
        }
      );
    }


    // ==================================
    // DETERMINE WHERE TO SEND USER
    // ==================================

    let redirectTo =
      '/dashboard';


    // Temporary password takes
    // highest priority.
    if (
      profile.must_change_password
    ) {
      redirectTo =
        '/change-password';
    }

    // Admin accounts go directly
    // to the admin dashboard.
    else if (
      profile.role ===
      'admin'
    ) {
      redirectTo =
        '/admin';
    }

    // Players who still need to
    // confirm Name / Alias / Department
    // go through onboarding.
    else if (
      !profile.onboarding_complete
    ) {
      redirectTo =
        '/onboarding';
    }

    // Players who have not yet chosen
    // a department or branch must do
    // so before reaching the dashboard.
    else if (
      !profile.work_location_type
    ) {
      redirectTo =
        '/select-workgroup';
    }


    // ==================================
    // SUCCESS
    // ==================================

    return NextResponse.json({
      ok: true,

      redirectTo,
    });

  } catch (
    error
  ) {
    console.error(
      '[LOGIN] Unexpected login error:',
      error
    );

    await writeErrorAuditLog({
      actorAlias: attemptedName,
      action: 'LOGIN_FAILED',
      description: 'Unexpected error during login.',
      error,
      context: { stage: 'unexpected' },
    });

    return NextResponse.json(
      {
        ok: false,

        code:
          'LOGIN_FAILED',

        message:
          'We could not sign you in. Please try again. If the problem continues, contact IT.',
      },
      {
        status: 500,
      }
    );
  }
}