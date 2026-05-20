import type { Express, Request, Response } from 'express';
import { getLongestStreak, getStreak, getStreakOfCorrectAnswers, Logger } from '@core/utils';
import { buildQuestion, QuestionDescriptor, QuestionMode } from '@features/worldly/question-builder';
import { getAreaMap } from '@features/worldly/utils';
import { notify } from '@services/notifier';
import type { TelegramBotConfig } from '@services/telegram';
import { addSubscription, getAllCountries, getAllStates, getCountryByCapital, getCountryByName, getStateByName, getSubscription, getUserGameLogs, updateGameLog, updateSubscription } from '@shared/worldly';
import { worldlyAuthMiddleware } from './auth.middleware';
import type { AnswerBody, AnswerResponse, GameMode, GameQuestionResponse, ModeStats, NewGameBody, StatsResponse, SubscriptionResponse, SubscriptionUpdateBody, WeakestEntry } from './dto';

const logger = new Logger('WorldlyApiController');

const VALID_MODES: ReadonlyArray<GameMode> = ['map', 'us_map', 'flag', 'capital', 'random'];

function toQuestionResponse(d: QuestionDescriptor): GameQuestionResponse {
  let prompt: GameQuestionResponse['prompt'] = {};
  if (d.mode === 'map' || d.mode === 'us_map') {
    const params = new URLSearchParams({ name: d.imageAreaName! });
    if (d.isState) params.set('state', '1');
    prompt = { imageUrl: `/api/worldly/area-map?${params.toString()}`, text: d.captionText };
  } else if (d.mode === 'flag') {
    prompt = { flagEmoji: d.flagEmoji };
  } else if (d.mode === 'capital') {
    prompt = { text: d.captionText };
  }
  return { gameId: d.gameId, mode: d.mode, prompt, options: d.options };
}

async function resolveCorrect(mode: string, correctId: string): Promise<{ label: string; emoji?: string; hebrewCapital?: string }> {
  if (mode === 'map' || mode === 'flag') {
    const country = await getCountryByName(correctId);
    return { label: country?.hebrewName ?? correctId, emoji: country?.emoji, hebrewCapital: country?.hebrewCapital };
  }
  if (mode === 'us_map') {
    const state = await getStateByName(correctId);
    return { label: state?.hebrewName ?? correctId };
  }
  // capital — correctId is the hebrewCapital
  const country = await getCountryByCapital(correctId);
  return { label: correctId, emoji: country?.emoji, hebrewCapital: correctId };
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export type WorldlyApiDeps = {
  readonly botConfig: TelegramBotConfig;
};

function userDetailsFromReq(req: Request) {
  const { telegramUserId, chatId, username } = req.worldlyUser!;
  return { telegramUserId, chatId, username: username ?? '', firstName: '', lastName: '' };
}

export function registerWorldlyApiRoutes(app: Express, deps: WorldlyApiDeps): void {
  const { botConfig } = deps;
  // Public route — must be registered before the auth middleware below so it stays unauthenticated.
  // Browsers can't send custom headers on <img> requests, so this endpoint must be reachable without X-Telegram-Init-Data.
  app.get('/api/worldly/area-map', async (req: Request, res: Response) => {
    const name = String(req.query.name ?? '');
    const isState = req.query.state === '1';
    if (!name) {
      res.status(400).json({ error: 'missing_name' });
      return;
    }
    try {
      const all = isState ? await getAllStates() : await getAllCountries();
      const path = getAreaMap(all, name, isState);
      if (!path) {
        res.status(404).json({ error: 'area_map_not_found' });
        return;
      }
      res.sendFile(path);
    } catch (err) {
      logger.error(`area-map failed name=${name}: ${err}`);
      res.status(500).json({ error: 'area_map_failed' });
    }
  });

  app.use('/api/worldly', worldlyAuthMiddleware);

  app.post('/api/worldly/game', async (req: Request, res: Response<GameQuestionResponse | { error: string }>) => {
    const body = req.body as NewGameBody | undefined;
    if (!body || !VALID_MODES.includes(body.mode)) {
      res.status(400).json({ error: 'invalid_mode' });
      return;
    }
    const { chatId } = req.worldlyUser!;
    const userDetails = userDetailsFromReq(req);
    try {
      const descriptor = await buildQuestion(body.mode as QuestionMode | 'random', chatId);
      notify(botConfig, { action: 'GAME_START', mode: body.mode, source: 'mini_app' }, userDetails);
      res.json(toQuestionResponse(descriptor));
    } catch (err) {
      logger.error(`buildQuestion failed chatId=${chatId} mode=${body.mode}: ${err}`);
      res.status(500).json({ error: 'build_failed' });
    }
  });

  app.post('/api/worldly/game/:gameId/answer', async (req: Request, res: Response<AnswerResponse | { error: string }>) => {
    const { gameId } = req.params;
    const body = req.body as AnswerBody | undefined;
    if (!body || typeof body.selected !== 'string') {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const { chatId } = req.worldlyUser!;
    const userDetails = userDetailsFromReq(req);
    try {
      const logs = await getUserGameLogs(chatId);
      const game = logs.find((g) => g.gameId === gameId);
      if (!game) {
        res.status(404).json({ error: 'game_not_found' });
        return;
      }
      await updateGameLog({ chatId, gameId, selected: body.selected });
      const correctInfo = await resolveCorrect(game.type.toLowerCase(), game.correct);

      // For capital mode the persisted `correct` is country.name but the selected/correctId on the client is hebrewCapital
      let correctId = game.correct;
      let isCorrect = body.selected === game.correct;
      if (game.type === 'CAPITAL') {
        correctId = correctInfo.hebrewCapital ?? game.correct;
        isCorrect = body.selected === correctId;
      }

      notify(botConfig, { action: 'GAME_ANSWER', mode: game.type.toLowerCase(), correct: isCorrect, source: 'mini_app' }, userDetails);
      res.json({
        correct: isCorrect,
        correctId,
        correctLabel: correctInfo.label,
        ...(correctInfo.emoji ? { correctEmoji: correctInfo.emoji } : {}),
        ...(correctInfo.hebrewCapital ? { correctHebrewCapital: correctInfo.hebrewCapital } : {}),
      });
    } catch (err) {
      logger.error(`answer failed chatId=${chatId} gameId=${gameId}: ${err}`);
      res.status(500).json({ error: 'answer_failed' });
    }
  });

  app.get('/api/worldly/stats', async (req: Request, res: Response<StatsResponse | { error: string }>) => {
    const { chatId } = req.worldlyUser!;
    try {
      const logs = await getUserGameLogs(chatId);
      const answered = logs.filter((l) => !!l.selected);
      const correct = answered.filter((l) => l.selected === l.correct);

      const today = logs.filter((l) => isToday(l.createdAt));
      const todayCorrect = today.filter((l) => l.selected === l.correct);

      const sortedByDate = [...logs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const currentDayStreak = getStreak(sortedByDate.map((l) => l.createdAt));
      const longestDayStreak = getLongestStreak(sortedByDate.map((l) => l.createdAt));
      const { currentStreak: currentCorrectStreak, longestStreak: longestCorrectStreak } = getStreakOfCorrectAnswers(sortedByDate);

      const perModeMap = new Map<string, { total: number; correct: number }>();
      for (const l of answered) {
        const mode = (l.type || '').toLowerCase();
        if (!['map', 'us_map', 'flag', 'capital'].includes(mode)) continue;
        const entry = perModeMap.get(mode) ?? { total: 0, correct: 0 };
        entry.total += 1;
        if (l.selected === l.correct) entry.correct += 1;
        perModeMap.set(mode, entry);
      }
      const perMode: ModeStats[] = [...perModeMap.entries()].map(([mode, v]) => ({
        mode: mode as ModeStats['mode'],
        total: v.total,
        correct: v.correct,
        accuracyPct: v.total ? (v.correct / v.total) * 100 : 0,
      }));

      const missCounts = new Map<string, number>();
      for (const l of answered) {
        if (l.selected === l.correct) continue;
        missCounts.set(l.correct, (missCounts.get(l.correct) ?? 0) + 1);
      }
      const topMissed = [...missCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      const [allCountries, allStates] = await Promise.all([getAllCountries(), getAllStates()]);
      const weakest: WeakestEntry[] = topMissed.map(([name, misses]) => {
        const c = allCountries.find((x) => x.name === name);
        const s = c ? null : allStates.find((x) => x.name === name);
        return { name, hebrewName: c?.hebrewName ?? s?.hebrewName ?? name, misses };
      });

      res.json({
        totalGames: logs.length,
        answeredGames: answered.length,
        correctGames: correct.length,
        accuracyPct: answered.length ? (correct.length / answered.length) * 100 : 0,
        todayGames: today.length,
        todayCorrect: todayCorrect.length,
        currentDayStreak,
        longestDayStreak,
        currentCorrectStreak,
        longestCorrectStreak,
        perMode,
        weakest,
      });
    } catch (err) {
      logger.error(`stats failed chatId=${chatId}: ${err}`);
      res.status(500).json({ error: 'stats_failed' });
    }
  });

  app.get('/api/worldly/subscription', async (req: Request, res: Response<SubscriptionResponse | { error: string }>) => {
    const { chatId } = req.worldlyUser!;
    const sub = await getSubscription(chatId);
    res.json({ isActive: !!sub?.isActive });
  });

  app.patch('/api/worldly/subscription', async (req: Request, res: Response<SubscriptionResponse | { error: string }>) => {
    const body = req.body as SubscriptionUpdateBody | undefined;
    if (!body || typeof body.isActive !== 'boolean') {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const { chatId } = req.worldlyUser!;
    const userDetails = userDetailsFromReq(req);
    try {
      const existing = await getSubscription(chatId);
      if (!existing) {
        await addSubscription(chatId);
        if (!body.isActive) await updateSubscription(chatId, { isActive: false });
      } else {
        await updateSubscription(chatId, { isActive: body.isActive });
      }
      notify(botConfig, { action: 'SUBSCRIPTION_UPDATE', isActive: body.isActive, source: 'mini_app' }, userDetails);
      res.json({ isActive: body.isActive });
    } catch (err) {
      logger.error(`subscription update failed chatId=${chatId}: ${err}`);
      res.status(500).json({ error: 'update_failed' });
    }
  });

  app.post('/api/worldly/open', async (req: Request, res: Response) => {
    const userDetails = userDetailsFromReq(req);
    notify(botConfig, { action: 'OPEN_APP', source: 'mini_app' }, userDetails);
    res.status(204).end();
  });

  logger.log('Worldly API routes registered at /api/worldly/*');
}
