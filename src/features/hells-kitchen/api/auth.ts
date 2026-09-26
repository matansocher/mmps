import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { env } from 'node:process';
import { HELLS_KITCHEN_COOKIE, HELLS_KITCHEN_SESSION_SECONDS } from '../constants';

export function passwordsMatch(a: string, b: string): boolean {
  const digest = (value: string) => crypto.createHash('sha256').update(value).digest();
  return crypto.timingSafeEqual(digest(a), digest(b));
}
export function createSession(secret: string, now = Date.now()): string {
  const expires = String(Math.floor(now / 1000) + HELLS_KITCHEN_SESSION_SECONDS);
  return `${expires}.${crypto.createHmac('sha256', secret).update(`hells-kitchen:${expires}`).digest('base64url')}`;
}
export function verifySession(token: string, secret: string, now = Date.now()): boolean {
  const parts = token.split('.');
  if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return false;
  const expires = Number(parts[0]);
  if (!Number.isSafeInteger(expires) || expires <= now / 1000 || expires > now / 1000 + HELLS_KITCHEN_SESSION_SECONDS + 1) return false;
  const signature = crypto.createHmac('sha256', secret).update(`hells-kitchen:${parts[0]}`).digest('base64url');
  return passwordsMatch(parts[1], signature);
}
export function sessionFromCookie(header: string | undefined): string {
  try {
    const part = header
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${HELLS_KITCHEN_COOKIE}=`));
    return part ? decodeURIComponent(part.slice(HELLS_KITCHEN_COOKIE.length + 1)) : '';
  } catch {
    return '';
  }
}
export function hellsKitchenAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = env.HELLS_KITCHEN_APP_PASSWORD;
  if (!secret) {
    res.status(503).json({ error: 'Game access is not configured.' });
    return;
  }
  if (!verifySession(sessionFromCookie(req.headers.cookie), secret)) {
    res.status(401).json({ error: 'Please sign in.' });
    return;
  }
  next();
}
