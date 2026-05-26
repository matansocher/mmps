import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOT_ACTIONS, BOT_CONFIG } from '@src/features/coach/coach.config';
import { CoachController } from '@src/features/coach/coach.controller';
import { CoachLauncherService } from '@src/features/coach/launcher.service';
import { buildCallbackQueryUpdate, buildTextMessageUpdate, createTestBot, resetUpdateBuilderCounters, simulateUpdate, type TestBot } from './harness';

vi.mock('@services/notifier', () => ({
  notify: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  saveUserDetails: vi.fn(),
  getSubscription: vi.fn(),
  addSubscription: vi.fn(),
  updateSubscription: vi.fn(),
}));

vi.mock('@shared/coach', () => mocks);

function createCoachServiceStub() {
  return {
    getCompetitions: vi.fn().mockResolvedValue([
      { id: 1, name: 'Premier League', icon: '🏴', hasTable: true },
      { id: 2, name: 'La Liga', icon: '🇪🇸', hasTable: true },
      { id: 3, name: 'Champions League', icon: '🏆', hasTable: false },
    ]),
    getMatchesSummary: vi.fn(),
    getMatchesSummaryMessage: vi.fn().mockResolvedValue('Match results here'),
    getCompetitionTable: vi.fn(),
    getCompetitionTableMessage: vi.fn().mockResolvedValue('Table here'),
    getCompetitionMatches: vi.fn(),
    getCompetitionMatchesMessage: vi.fn().mockResolvedValue('Matches here'),
  } as any;
}

describe('CoachController E2E', () => {
  let testBot: TestBot;

  beforeEach(() => {
    resetUpdateBuilderCounters();
    vi.clearAllMocks();
    testBot = createTestBot(BOT_CONFIG);
    const launcher = new CoachLauncherService(testBot.bot);
    const controller = new CoachController(createCoachServiceStub(), testBot.bot, launcher);
    controller.init();
  });

  describe('/start', () => {
    it('greets a new user with the long welcome and creates a subscription', async () => {
      mocks.saveUserDetails.mockResolvedValue(false);
      mocks.getSubscription.mockResolvedValue(null);

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

      expect(mocks.saveUserDetails).toHaveBeenCalledTimes(1);
      expect(mocks.addSubscription).toHaveBeenCalledTimes(1);
      expect(mocks.updateSubscription).not.toHaveBeenCalled();

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(1);
      expect(sent[0].payload.text).toContain('שלום');
      expect(sent[0].payload.text).toContain('תוצאות של משחקי ספורט');
    });

    it('greets a returning user with the short reply and reactivates subscription', async () => {
      mocks.saveUserDetails.mockResolvedValue(true);
      mocks.getSubscription.mockResolvedValue({ chatId: 1, isActive: false });

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

      expect(mocks.updateSubscription).toHaveBeenCalledWith(expect.any(Number), { isActive: true });
      expect(mocks.addSubscription).not.toHaveBeenCalled();

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent[0].payload.text).toContain('אני אתריע לך');
    });
  });

  describe('/tables', () => {
    it('replies with an inline keyboard of competitions that have tables', async () => {
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/tables' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(1);
      expect(sent[0].payload.text).toEqual('לאיזה ליגה?');

      const keyboard = sent[0].payload.reply_markup?.inline_keyboard;
      const buttonsFlat = keyboard.flat();
      expect(buttonsFlat).toHaveLength(2);
      expect(buttonsFlat.every((b: any) => b.callback_data.startsWith(`${BOT_ACTIONS.TABLE} - `))).toBe(true);
    });
  });

  describe('callback_query', () => {
    it('handles STOP callback by deactivating the subscription and acknowledging', async () => {
      mocks.getSubscription.mockResolvedValue({ chatId: 1, isActive: true });

      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: BOT_ACTIONS.STOP }));

      expect(mocks.updateSubscription).toHaveBeenCalledWith(expect.any(Number), { isActive: false });

      const replies = testBot.transport.callsByMethod('sendMessage');
      expect(replies[0].payload.text).toContain('מפסיק לשלוח לך עדכונים');

      const answers = testBot.transport.callsByMethod('answerCallbackQuery');
      expect(answers).toHaveLength(1);
      expect(answers[0].payload.show_alert).toBeUndefined();
    });

    it('answers with an alert when callback data is invalid', async () => {
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: 'nonsense-action' }));

      const answers = testBot.transport.callsByMethod('answerCallbackQuery');
      expect(answers).toHaveLength(1);
      expect(answers[0].payload.show_alert).toBe(true);
      expect(answers[0].payload.text).toContain('Something went wrong');
    });
  });
});
