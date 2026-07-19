import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { SAVINGS_SESSION_COOKIE } from '../constants';
import { readCookie, verifySavingsSessionToken } from './auth';

export function savingsAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const password = env.SAVINGS_APP_PASSWORD;
  if (!password) {
    res.status(500).json({ error: 'savings_auth_not_configured' });
    return;
  }

  const token = readCookie(req.header('cookie'), SAVINGS_SESSION_COOKIE);
  if (!token || !verifySavingsSessionToken(token, password)) {
    res.status(401).json({ error: 'authentication_required' });
    return;
  }

  next();
}
