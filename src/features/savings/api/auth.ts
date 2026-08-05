import crypto from 'node:crypto';
import { SAVINGS_SESSION_TTL_SECONDS } from '../constants';

function digest(value: string): Buffer {
  return crypto.createHash('sha256').update(value).digest();
}

export function passwordsMatch(candidate: string, expected: string): boolean {
  return crypto.timingSafeEqual(digest(candidate), digest(expected));
}

export function createSavingsSessionToken(secret: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SAVINGS_SESSION_TTL_SECONDS;
  const payload = String(expiresAt);
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySavingsSessionToken(token: string, secret: string, now = Date.now()): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expiresAtRaw, signature] = parts;
  if (!expiresAtRaw || !signature || !/^\d+$/.test(expiresAtRaw)) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;

  const expected = crypto.createHmac('sha256', secret).update(expiresAtRaw).digest('base64url');
  return passwordsMatch(signature, expected);
}

export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return null;
}
