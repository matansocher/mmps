import crypto from 'node:crypto';
import { env } from 'node:process';
import { FM_SESSION_TTL_SECONDS } from '../constants';

// Session-signing secret. Falls back to a dev secret so the app runs locally
// before FM_SESSION_SECRET is configured (dev-mode login only).
export function sessionSecret(): string {
  return env.FM_SESSION_SECRET || 'fm-dev-session-secret';
}

function digest(value: string): Buffer {
  return crypto.createHash('sha256').update(value).digest();
}

function timingSafeMatch(a: string, b: string): boolean {
  const da = digest(a);
  const db = digest(b);
  return crypto.timingSafeEqual(da, db);
}

// Signed token: `<userId>.<expiresAt>.<hmac>`. Stateless, verified per request.
export function createSessionToken(userId: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + FM_SESSION_TTL_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string, now = Date.now()): string | null {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return null;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const parts = payload.split('.');
  if (parts.length !== 2) return null;

  const [userId, expiresAtRaw] = parts;
  if (!userId || !/^\d+$/.test(expiresAtRaw)) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return null;

  const expected = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  if (!timingSafeMatch(signature, expected)) return null;
  return userId;
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
