import express, { type Express, type Request, type Response } from 'express';
import path from 'node:path';
import { env } from 'node:process';
import { z } from 'zod';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { provideTelegramBot } from '@services/telegram';
import { type IsraelGeoAuthenticatedRequest, israelGeoAuthMiddleware } from './api/auth.middleware';
import { DailyRouteService } from './daily-route.service';
import { getIsraelDate } from './date';
import { IsraelGeoGameError, IsraelGeoGameService } from './game.service';
import { BOT_CONFIG, ISRAEL_GEO_CONFIG } from './israel-geo.config';
import { IsraelGeoController } from './israel-geo.controller';
import { DB_NAME, ensureDailyRouteIndexes, ensurePlayer, ensurePlayerIndexes, getPlayerByShareToken, rotateShareToken, toPlayerProfile, updatePlayerIdentity } from './mongo';
import { consumeWeeklyPreview, equipCosmetic, purchaseCosmetic, queueWeeklyPreview, recordDailyCompletion, recordNormalRound } from './progression.service';
import { ISRAEL_GEO_EVENTS, type IsraelGeoEvent } from './types';

const logger = new Logger('israel-geo.init');
const guessSchema = z.object({
  round: z.number().int().min(1).max(5),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(ISRAEL_GEO_CONFIG.minCircleRadiusKm).max(ISRAEL_GEO_CONFIG.maxCircleRadiusKm),
});
const identitySchema = z.object({
  displayName: z.string().trim().min(2).max(32),
  avatarId: z.enum(ISRAEL_GEO_CONFIG.avatarIds),
});
const sessionRateLimits = new Map<string, { count: number; windowStartedAt: number }>();

function canCreateSession(key: string): boolean {
  const now = Date.now();
  return consumeRateLimit('global', ISRAEL_GEO_CONFIG.maxSessionsGloballyPerMinute, now) && consumeRateLimit(`user:${key}`, ISRAEL_GEO_CONFIG.maxSessionsPerIpPerMinute, now);
}

function consumeRateLimit(key: string, limit: number, now: number): boolean {
  const current = sessionRateLimits.get(key);
  if (!current || now - current.windowStartedAt >= 60_000) {
    sessionRateLimits.set(key, { count: 1, windowStartedAt: now });
    return true;
  }
  if (current.count >= limit) return false;
  sessionRateLimits.set(key, { ...current, count: current.count + 1 });
  return true;
}

function authenticated(req: Request): IsraelGeoAuthenticatedRequest {
  return req as IsraelGeoAuthenticatedRequest;
}

export async function initIsraelGeo(app: Express): Promise<void> {
  await createMongoConnection(DB_NAME);
  await Promise.all([ensurePlayerIndexes(), ensureDailyRouteIndexes()]);

  if (env.ISRAEL_GEO_TELEGRAM_BOT_TOKEN) {
    const bot = provideTelegramBot(BOT_CONFIG);
    new IsraelGeoController(bot).init();
  } else if (env.NODE_ENV === 'production') {
    throw new Error('ISRAEL_GEO_TELEGRAM_BOT_TOKEN is required in production');
  } else {
    logger.warn('ISRAEL_GEO_TELEGRAM_BOT_TOKEN is not configured; serving the local Mini App without starting the bot');
  }

  const gameService = new IsraelGeoGameService(undefined, async (telegramUserId, mode, result, results, dailyIsraelDate) => {
    if (mode === 'normal') return recordNormalRound(telegramUserId, result);
    if (mode === 'daily-scored' && result.completed) return recordDailyCompletion(telegramUserId, results, dailyIsraelDate);
    return undefined;
  });
  const dailyRouteService = new DailyRouteService(gameService);
  const spaDist = path.resolve('apps/israel-geo-web/dist');

  app.get('/israel-geo/api/public-profiles/:token', async (req: Request, res: Response) => {
    const token = req.params.token;
    if (typeof token !== 'string') {
      res.status(400).json({ error: 'invalid_share_token' });
      return;
    }
    const player = await getPlayerByShareToken(token);
    if (!player) {
      res.status(404).json({ error: 'profile_not_found' });
      return;
    }
    const profile = toPlayerProfile(player);
    res.json({
      displayName: profile.displayName,
      avatarId: profile.avatarId,
      xp: profile.xp,
      level: profile.level,
      title: profile.title,
      bestScore: profile.bestScore,
      gamesPlayed: profile.gamesPlayed,
      passportStamps: profile.passportStamps,
      badges: profile.badges,
      crownTier: profile.crownTier,
    });
  });

  app.post('/israel-geo/api/events', (req: Request, res: Response) => {
    res.status(204).end();
    const event = (req.body as IsraelGeoEvent | undefined)?.event;
    if (!event || !ISRAEL_GEO_EVENTS.has(event)) return;
    if (!env.ISRAEL_GEO_TELEGRAM_BOT_TOKEN) return;
    try {
      const body = req.body as IsraelGeoEvent;
      notify(BOT_CONFIG, { action: `israel geo ${event}`, uid: body.uid ?? 'anon', ...(body.data ?? {}) });
    } catch (err) {
      logger.error(`Failed to forward Israel Geo event: ${err}`);
    }
  });

  app.use('/israel-geo/api', israelGeoAuthMiddleware);

  app.get('/israel-geo/api/profile', async (req: Request, res: Response) => {
    const user = authenticated(req).israelGeoUser;
    res.json(toPlayerProfile(await ensurePlayer(user)));
  });

  app.patch('/israel-geo/api/profile', async (req: Request, res: Response) => {
    const parsed = identitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_profile' });
      return;
    }
    const user = authenticated(req).israelGeoUser;
    await ensurePlayer(user);
    res.json(toPlayerProfile(await updatePlayerIdentity(user.telegramUserId, parsed.data.displayName, parsed.data.avatarId)));
  });

  app.post('/israel-geo/api/profile/share-token', async (req: Request, res: Response) => {
    const user = authenticated(req).israelGeoUser;
    await ensurePlayer(user);
    const { token } = await rotateShareToken(user.telegramUserId);
    res.json({ token, path: `/israel-geo/profile/${token}` });
  });

  app.post('/israel-geo/api/sessions', async (req: Request, res: Response) => {
    const user = authenticated(req).israelGeoUser;
    if (!canCreateSession(String(user.telegramUserId))) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }
    try {
      await ensurePlayer(user);
      const session = await gameService.createSession(user.telegramUserId);
      res.status(201).json({ ...session, previewCosmeticId: await consumeWeeklyPreview(user.telegramUserId) });
    } catch (err) {
      logger.error(`Failed to create Israel Geo session: ${err}`);
      res.status(503).json({ error: 'location_generation_failed' });
    }
  });

  app.post('/israel-geo/api/daily-route/session', async (req: Request, res: Response) => {
    const user = authenticated(req).israelGeoUser;
    if (!canCreateSession(String(user.telegramUserId))) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }
    try {
      const player = await ensurePlayer(user);
      const session = await dailyRouteService.createSession(user.telegramUserId, player.dailyProgress.lastCompletedDate === getIsraelDate());
      res.status(201).json({ ...session, previewCosmeticId: await consumeWeeklyPreview(user.telegramUserId) });
    } catch (err) {
      logger.error(`Failed to create Israel Geo Daily Route: ${err}`);
      res.status(503).json({ error: 'daily_route_generation_failed' });
    }
  });

  app.post('/israel-geo/api/sessions/:sessionId/guesses', async (req: Request, res: Response) => {
    const parsed = guessSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_guess' });
      return;
    }
    try {
      const { round, lat, lng, radiusKm } = parsed.data;
      const sessionId = req.params.sessionId;
      if (typeof sessionId !== 'string') {
        res.status(400).json({ error: 'invalid_session' });
        return;
      }
      const user = authenticated(req).israelGeoUser;
      res.json(await gameService.submitGuess(sessionId, { round, coordinates: { lat, lng }, radiusKm }, user.telegramUserId));
    } catch (err) {
      if (err instanceof IsraelGeoGameError) {
        res.status(err.status).json({ error: err.code });
        return;
      }
      logger.error(`Failed to score Israel Geo guess: ${err}`);
      res.status(500).json({ error: 'guess_failed' });
    }
  });

  app.post('/israel-geo/api/cosmetics/:cosmeticId/purchase', async (req: Request, res: Response) => {
    try {
      const user = authenticated(req).israelGeoUser;
      await ensurePlayer(user);
      res.json(toPlayerProfile(await purchaseCosmetic(user.telegramUserId, String(req.params.cosmeticId))));
    } catch (err) {
      const code = err instanceof Error ? err.message : 'purchase_failed';
      res.status(code === 'insufficient_coins' ? 409 : 400).json({ error: code });
    }
  });

  app.post('/israel-geo/api/cosmetics/:cosmeticId/equip', async (req: Request, res: Response) => {
    try {
      const user = authenticated(req).israelGeoUser;
      await ensurePlayer(user);
      res.json(toPlayerProfile(await equipCosmetic(user.telegramUserId, String(req.params.cosmeticId))));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'equip_failed' });
    }
  });

  app.post('/israel-geo/api/cosmetics/preview', async (req: Request, res: Response) => {
    try {
      const user = authenticated(req).israelGeoUser;
      await ensurePlayer(user);
      res.json(toPlayerProfile(await queueWeeklyPreview(user.telegramUserId)));
    } catch (err) {
      res.status(409).json({ error: err instanceof Error ? err.message : 'preview_failed' });
    }
  });

  app.use('/israel-geo', express.static(spaDist));
  app.get('/israel-geo/*splat', (_req: Request, res: Response) => {
    res.sendFile(path.join(spaDist, 'index.html'));
  });
  logger.log(`Israel Geo SPA served from ${spaDist} at /israel-geo/*`);
}
