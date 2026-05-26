import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCallbackQueryUpdate, buildTextMessageUpdate, createTestBot, resetUpdateBuilderCounters, simulateUpdate, type TestBot } from './harness';

vi.mock('@shared/world-cup', () => ({ upsertUser: vi.fn().mockResolvedValue(undefined) }));

const testBotHolder = vi.hoisted(() => ({ current: null as TestBot | null }));

vi.mock('@services/telegram', async () => {
  const actual = await vi.importActual<any>('@services/telegram');
  return {
    ...actual,
    provideTelegramBot: () => testBotHolder.current!.bot,
  };
});

import { BOT_CONFIG } from '@src/features/world-cup/world-cup.config';
import { WorldCupController } from '@src/features/world-cup/world-cup.controller';

function createWorldCupServiceStub() {
  return {
    getUpcomingMatchesText: vi.fn().mockResolvedValue('🇮🇱 vs 🇸🇪 — היום 21:00'),
    getLeaderboardText: vi.fn().mockResolvedValue('1. Alice — 12\n2. Bob — 9'),
  } as any;
}

describe('WorldCupController E2E', () => {
  let testBot: TestBot;
  let service: ReturnType<typeof createWorldCupServiceStub>;

  beforeEach(() => {
    resetUpdateBuilderCounters();
    vi.clearAllMocks();
    testBot = createTestBot(BOT_CONFIG);
    testBotHolder.current = testBot;
    service = createWorldCupServiceStub();
    const controller = new WorldCupController(service);
    controller.init();
  });

  afterEach(() => {
    testBotHolder.current = null;
    delete process.env.WORLD_CUP_MINI_APP_URL;
  });

  it('greets users on /start and persists them', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

    const sent = testBot.transport.callsByMethod('sendMessage');
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.text).toContain('ברוכים הבאים');
    const buttons = sent[0].payload.reply_markup?.inline_keyboard?.flat();
    expect(buttons.map((b: any) => b.callback_data)).toEqual(expect.arrayContaining(['matches', 'leaderboard', 'open_app']));
  });

  it('replies with static help text on /help', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/help' }));

    const sent = testBot.transport.callsByMethod('sendMessage');
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.text).toContain('פקודות הבוט');
  });

  it('sends the upcoming matches text on /matches', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/matches' }));

    expect(service.getUpcomingMatchesText).toHaveBeenCalledTimes(1);
    const sent = testBot.transport.callsByMethod('sendMessage');
    expect(sent[0].payload.text).toContain('🇮🇱 vs 🇸🇪');
  });

  it('sends the leaderboard text on /leaderboard', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/leaderboard' }));

    expect(service.getLeaderboardText).toHaveBeenCalledTimes(1);
    const sent = testBot.transport.callsByMethod('sendMessage');
    expect(sent[0].payload.text).toContain('Alice');
  });

  describe('callback_query', () => {
    it('routes the "matches" callback through the service and answers the callback', async () => {
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: 'matches' }));

      expect(service.getUpcomingMatchesText).toHaveBeenCalledTimes(1);
      const answers = testBot.transport.callsByMethod('answerCallbackQuery');
      expect(answers).toHaveLength(1);
    });

    it('warns when the mini-app URL is missing for open_app', async () => {
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: 'open_app' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent.at(-1)?.payload.text).toContain('לחצו למטה');
      expect(sent.at(-1)?.payload.reply_markup).toBeNull();
    });
  });
});
