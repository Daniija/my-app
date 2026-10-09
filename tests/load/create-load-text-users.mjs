
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// LOAD TEST USER CREATOR
// ============================================================
// Reads ONLY from .env.test.local.
// Refuses to run unless APP_ENV=test.
// Existing users are only modified if they were previously
// marked with app_metadata.load_test = true.
// ============================================================

dotenv.config({ path: '.env.test.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const APP_ENV = process.env.APP_ENV;

const USER_COUNT = Number(process.env.LOAD_TEST_USERS || 50);
const USER_PREFIX = process.env.LOAD_TEST_USER_PREFIX || 'loadtest';
const PASSWORD =
  process.env.LOAD_TEST_PASSWORD || 'LoadTest1234';

const EMAIL_DOMAIN = 'users.example.com';


// ============================================================
// SAFETY CHECKS
// ============================================================

if (APP_ENV !== 'test') {
  console.error('\n❌ REFUSING TO RUN');
  console.error('APP_ENV must be set to "test" in .env.test.local\n');
  process.exit(1);
}

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing.');
  process.exit(1);
}

if (!SUPABASE_SECRET_KEY) {
  console.error('❌ SUPABASE_SECRET_KEY is missing.');
  process.exit(1);
}

if (
  !Number.isInteger(USER_COUNT) ||
  USER_COUNT < 1 ||
  USER_COUNT > 200
) {
  console.error(
    '❌ LOAD_TEST_USERS must be between 1 and 200.'
  );
  process.exit(1);
}

if (PASSWORD.length < 8) {
  console.error(
    '❌ LOAD_TEST_PASSWORD must be at least 8 characters.'
  );
  process.exit(1);
}


// ============================================================
// SUPABASE ADMIN CLIENT
// ============================================================

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);


// ============================================================
// HELPERS
// ============================================================

function padNumber(number) {
  return String(number).padStart(2, '0');
}


async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const {
      data,
      error,
    } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const found = data.users.find(
      (user) =>
        user.email?.toLowerCase() === email.toLowerCase()
    );

    if (found) {
      return found;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page++;
  }
}


// ============================================================
// CREATE / RESET TEST USER
// ============================================================

async function createTestUser(number) {
  const suffix = padNumber(number);

  const username = `${USER_PREFIX}${suffix}`;
  const email = `${username}@${EMAIL_DOMAIN}`;
  const alias = `Test Agent ${suffix}`;

  console.log(`\nCreating ${username}...`);

  let authUser = await findAuthUserByEmail(email);

  // ----------------------------------------------------------
  // Existing account
  // ----------------------------------------------------------

  if (authUser) {
    if (authUser.app_metadata?.load_test !== true) {
      throw new Error(
        `SAFETY STOP: ${email} already exists but is NOT marked as a load-test account.`
      );
    }

    const {
      data,
      error,
    } = await supabase.auth.admin.updateUserById(
      authUser.id,
      {
        password: PASSWORD,

        app_metadata: {
          ...authUser.app_metadata,
          role: 'player',
          load_test: true,
        },

        user_metadata: {
          ...authUser.user_metadata,
          username,
          load_test: true,
        },
      }
    );

    if (error) {
      throw error;
    }

    authUser = data.user;

    console.log(`↻ Reusing existing test user ${username}`);
  }

  // ----------------------------------------------------------
  // New account
  // ----------------------------------------------------------

  else {
    const {
      data,
      error,
    } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,

      app_metadata: {
        role: 'player',
        load_test: true,
      },

      user_metadata: {
        username,
        load_test: true,
      },
    });

    if (error) {
      throw error;
    }

    authUser = data.user;

    console.log(`✓ Auth user created`);
  }


  // ----------------------------------------------------------
  // Create/update profile
  // ----------------------------------------------------------

  const {
    error: profileError,
  } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        username,
        alias,
        department: 'Load Test',
        role: 'player',
        is_active: true,
        onboarding_complete: true,
      },
      {
        onConflict: 'id',
      }
    );

  if (profileError) {
    throw profileError;
  }

  console.log(`✓ Profile ready`);

  // ----------------------------------------------------------
  // Start leaderboard clean
  // ----------------------------------------------------------

  const {
    error: leaderboardError,
  } = await supabase
    .from('leaderboard_entries')
    .delete()
    .eq('player_id', authUser.id);

  if (leaderboardError) {
    console.warn(
      `⚠ Could not clear leaderboard for ${username}:`,
      leaderboardError.message
    );
  }

  console.log(`✓ ${username} ready`);
}


// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('\n========================================');
  console.log(' CYBER DEFENCE LOAD TEST USER CREATOR');
  console.log('========================================');

  console.log(`Environment: ${APP_ENV}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Users: ${USER_COUNT}`);
  console.log(`Prefix: ${USER_PREFIX}`);
  console.log('');

  let successful = 0;

  for (let i = 1; i <= USER_COUNT; i++) {
    try {
      await createTestUser(i);
      successful++;
    } catch (error) {
      console.error(`\n❌ Failed on user ${i}`);
      console.error(error);
      console.error('\nStopping for safety.');
      process.exit(1);
    }
  }

  console.log('\n========================================');
  console.log(' COMPLETE');
  console.log('========================================');
  console.log(`${successful}/${USER_COUNT} users ready.`);
  console.log('');
  console.log('Login pattern:');
  console.log(`${USER_PREFIX}01`);
  console.log(`${USER_PREFIX}02`);
  console.log('...');
  console.log(`${USER_PREFIX}${padNumber(USER_COUNT)}`);
  console.log('');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});