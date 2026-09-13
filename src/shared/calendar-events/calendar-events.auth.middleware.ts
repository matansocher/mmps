import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function extractToken(req: Request): string | null {
  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  const apiKey = req.header('x-api-key');
  return apiKey ? apiKey.trim() : null;
}

export function calendarEventsAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = env.CALENDAR_SYNC_SECRET;
  if (!secret) {
    res.status(500).json({ success: false, error: 'calendar_sync_not_configured' });
    return;
  }

  const token = extractToken(req);
  if (!token || !safeEqual(token, secret)) {
    res.status(401).json({ success: false, error: 'authentication_required' });
    return;
  }

  next();
}
