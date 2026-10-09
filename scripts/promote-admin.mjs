import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const usernameArg = process.argv[2];

if (!usernameArg) {
  console.error(
    'Usage: npm run admin:promote -- <username>'
  );
  process.exit(1);
}

const username = usernameArg
  .trim()
  .toLowerCase();

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serverKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error(
    'NEXT_PUBLIC_SUPABASE_URL is missing from .env.local'
  );
  process.exit(1);
}

if (!serverKey) {
  console.error(
    'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is missing from .env.local'
  );
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  serverKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

console.log(
  `Looking for player: ${username}`
);

const {
  data: profile,
  error: profileError,
} = await supabase
  .from('profiles')
  .select(
    'id, username, alias, role, is_active'
  )
  .eq('username', username)
  .maybeSingle();

if (profileError) {
  console.error(
    'Unable to query profiles:',
    profileError
  );
  process.exit(1);
}

if (!profile) {
  console.error(
    `No player profile found for username "${username}".`
  );
  process.exit(1);
}

if (!profile.is_active) {
  console.error(
    'This player account is inactive.'
  );
  process.exit(1);
}

const {
  data: authUserData,
  error: authReadError,
} =
  await supabase.auth.admin.getUserById(
    profile.id
  );

if (authReadError) {
  console.error(
    'Unable to load Supabase Auth user:',
    authReadError
  );
  process.exit(1);
}

if (!authUserData.user) {
  console.error(
    'Supabase Auth user was not found.'
  );
  process.exit(1);
}

/*
 * Update the application profile.
 */
const {
  error: profileUpdateError,
} = await supabase
  .from('profiles')
  .update({
    role: 'admin',
    updated_at: new Date().toISOString(),
  })
  .eq('id', profile.id);

if (profileUpdateError) {
  console.error(
    'Unable to update profile role:',
    profileUpdateError
  );
  process.exit(1);
}

/*
 * Also store admin status in Auth app_metadata.
 */
const currentMetadata =
  authUserData.user.app_metadata ?? {};

const {
  error: authUpdateError,
} =
  await supabase.auth.admin.updateUserById(
    profile.id,
    {
      app_metadata: {
        ...currentMetadata,
        app_role: 'admin',
      },
    }
  );

if (authUpdateError) {
  console.error(
    'Profile was updated, but Auth metadata could not be updated:',
    authUpdateError
  );

  console.error(
    'You may need to correct this manually in Supabase.'
  );

  process.exit(1);
}

console.log('');
console.log('Admin promotion successful.');
console.log(`Username: ${profile.username}`);
console.log(
  `Alias: ${profile.alias ?? 'Not configured'}`
);
console.log('Role: admin');
console.log('');
console.log(
  'Sign out of the web app and sign back in before opening /admin.'
);