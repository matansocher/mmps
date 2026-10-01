import type { Express } from 'express';
import { env } from 'node:process';
import { createRateLimiter } from '@core/express';
import { Logger } from '@core/utils';
import { HELLS_KITCHEN_COOKIE, HELLS_KITCHEN_SESSION_SECONDS } from '../constants';
import { emptyProfile } from '../game/content';
import { saveBodySchema } from '../game/schema';
import type { Profile, Save } from '../game/types';
import { getProfile, saveProfile } from '../mongo/profile.repository';
import { createSession, hellsKitchenAuth, passwordsMatch } from './auth';

export type ProfileStore = { readonly get: () => Promise<Save | null>; readonly put: (revision: number, profile: Profile) => Promise<Save | null> };
const logger = new Logger('hells-kitchen:api');

export function registerHellsKitchenApiRoutes(app: Express, store: ProfileStore = { get: getProfile, put: saveProfile }): void {
  const base = '/api/hells-kitchen';
  const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'hells-kitchen-login' });
  app.use(base, (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  const cookie = (value: string, age: number) => `${HELLS_KITCHEN_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${env.IS_PROD === 'true' ? '; Secure' : ''}`;
  app.post(`${base}/auth/login`, limiter, (req, res) => {
    const secret = env.HELLS_KITCHEN_APP_PASSWORD;
    if (!secret) {
      res.status(503).json({ error: 'Game access is not configured.' });
      return;
    }
    if (typeof req.body?.password !== 'string' || req.body.password.length > 1000 || !passwordsMatch(req.body.password, secret)) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }
    res.setHeader('Set-Cookie', cookie(createSession(secret), HELLS_KITCHEN_SESSION_SECONDS));
    res.json({ success: true });
  });
  app.post(`${base}/auth/logout`, (_req, res) => {
    res.setHeader('Set-Cookie', cookie('', 0));
    res.status(204).end();
  });
  app.use(base, hellsKitchenAuth);
  app.get(`${base}/auth/session`, (_req, res) => {
    res.json({ success: true });
  });
  app.get(`${base}/profile`, async (_req, res) => {
    try {
      res.json((await store.get()) ?? { revision: 0, profile: emptyProfile(), updatedAt: null });
    } catch (err) {
      logger.error(`Could not load game: ${err}`);
      res.status(503).json({ error: 'Cloud save unavailable. Your local progress is safe.' });
    }
  });
  app.put(`${base}/profile`, async (req, res) => {
    const parsed = saveBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid save data.' });
      return;
    }
    try {
      const result = await store.put(parsed.data.revision, parsed.data.profile as Profile);
      if (!result) {
        res.status(409).json({ error: 'save_conflict', save: (await store.get()) ?? { revision: 0, profile: emptyProfile(), updatedAt: null } });
        return;
      }
      res.json(result);
    } catch (err) {
      logger.error(`Could not save game: ${err}`);
      res.status(503).json({ error: 'Cloud save unavailable. Your local progress is safe.' });
    }
  });
}
