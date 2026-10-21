import { describe, expect, it } from 'vitest';
import { isValidAlias, normalizeAlias } from '../src/lib/auth/alias';

describe('profile alias validation', () => {
  it('collapses internal whitespace and trims', () => {
    expect(normalizeAlias('  Agent   Cipher  ')).toBe('Agent Cipher');
  });

  it('accepts aliases between 3 and 24 characters', () => {
    expect(isValidAlias('Fox')).toBe(true);
    expect(isValidAlias('A'.repeat(24))).toBe(true);
  });

  it('rejects aliases outside the length bounds', () => {
    expect(isValidAlias('Fo')).toBe(false);
    expect(isValidAlias('A'.repeat(25))).toBe(false);
  });

  it('validates length after normalization, not raw input', () => {
    expect(isValidAlias('  Fo  ')).toBe(false);
    expect(isValidAlias(' Fox ')).toBe(true);
  });
});
