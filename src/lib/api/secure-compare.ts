import { timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison for secrets (webhook tokens, cron bearer
 * tokens, shared secrets). Plain `!==` short-circuits on the first mismatched
 * byte, which leaks a timing signal proportional to how many leading
 * characters an attacker got right.
 */
export function secureCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // timingSafeEqual throws on length mismatch; lengths of secrets aren't
  // sensitive, so returning early here is fine.
  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
}
