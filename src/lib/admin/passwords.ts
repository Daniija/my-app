import { randomBytes } from 'crypto';

import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

// Temporary passwords use the CDU9-XXXXXXXXXX7 shape so they are easy to
// recognise as system-issued and always satisfy length requirements.
export function createTemporaryPassword() {
  const randomPart = randomBytes(8).toString('base64url').slice(0, 10);

  return `CDU9-${randomPart}7`;
}

// Which step failed, so callers can map it to the right HTTP status and
// message without re-implementing the Supabase calls.
export type PasswordResetStage = 'password' | 'flag';

export type PasswordResetOutcome =
  | { ok: true; temporaryPassword: string }
  | { ok: false; stage: PasswordResetStage; message: string };

// Issues a fresh temporary password for a single player and forces them to
// choose a new one on next sign-in. Authorisation and confirming the target
// is actually a player are the caller's responsibility.
export async function resetPlayerCredentials(
  admin: AdminClient,
  playerId: string
): Promise<PasswordResetOutcome> {
  const temporaryPassword = createTemporaryPassword();

  const { error: passwordError } = await admin.auth.admin.updateUserById(
    playerId,
    { password: temporaryPassword }
  );

  if (passwordError) {
    console.error(
      '[PASSWORD RESET] Auth password update failed:',
      passwordError
    );

    return { ok: false, stage: 'password', message: passwordError.message };
  }

  const { error: flagError } = await admin
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', playerId);

  if (flagError) {
    console.error(
      '[PASSWORD RESET] Unable to set change-password flag:',
      flagError
    );

    return { ok: false, stage: 'flag', message: flagError.message };
  }

  return { ok: true, temporaryPassword };
}
