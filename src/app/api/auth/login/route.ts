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
          must_change_password
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