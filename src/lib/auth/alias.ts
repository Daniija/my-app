export function normalizeAlias(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function isValidAlias(value: string) {
  const alias = normalizeAlias(value);
  return alias.length >= 3 && alias.length <= 24;
}
