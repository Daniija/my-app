export const USERNAME_EMAIL_DOMAIN = 'users.example.com';

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string) {
  const username = normalizeUsername(value);
  return /^[a-z0-9][a-z0-9_-]{2,19}$/.test(username);
}

export function usernameToAuthEmail(value: string) {
  const username = normalizeUsername(value);
  if (!isValidUsername(username)) throw new Error('INVALID_USERNAME');
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}

export function validatePassword(value: string) {
  if (value.length < 8 || value.length > 72) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (!/[0-9]/.test(value)) return false;
  return true;
}
