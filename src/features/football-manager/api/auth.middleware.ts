import type { NextFunction, Request, Response } from 'express';
import { FM_SESSION_COOKIE } from '../constants';
import { readCookie, verifySessionToken } from './session';

// Express request augmented with the authenticated user id.
export type AuthedRequest = Request & { userId?: string };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = readCookie(req.header('cookie'), FM_SESSION_COOKIE);
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: 'authentication_required' });
    return;
  }
  req.userId = userId;
  next();
}
