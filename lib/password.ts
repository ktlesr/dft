import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id parameters — OWASP 2024 "second" profile.
 * Target verification time ~50ms on modern hardware.
 */
const ARGON2 = {
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}

/**
 * Server-side password policy check.
 * Keep in sync with Zod schema on the client.
 */
export function isStrongPassword(pw: string): boolean {
  if (pw.length < 10) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}
