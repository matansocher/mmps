import type { Express } from 'express';
import { initChatbot } from './chatbot.init';

const { callOrder, createChatbotCheckpointer, provideTelegramBot, controllerInit, schedulerInit } = vi.hoisted(() => {
  const bot = { polling: false };
  const callOrder: string[] = [];
  return {
    callOrder,
    createChatbotCheckpointer: vi.fn(async () => {
      callOrder.push('checkpointer');
      return {};
    }),
    // Mirrors grammY: bot.start() begins polling asynchronously, after which new listeners are rejected
    provideTelegramBot: vi.fn(() => {
      callOrder.push('provideTelegramBot');
      queueMicrotask(() => {
        bot.polling = true;
      });
      return bot;
    }),
    controllerInit: vi.fn(() => {
      if (bot.polling) throw new Error('You cannot call `bot.on` once the bot is running');
      callOrder.push('controller.init');
    }),
    schedulerInit: vi.fn(),
  };
});

vi.mock('@core/mongo', () => ({ createMongoConnection: vi.fn() }));
vi.mock('@services/github/utils', () => ({ initOctokit: vi.fn() }));
vi.mock('@services/telegram', () => ({ provideTelegramBot }));
vi.mock('@shared/ai', () => ({ ensureUsageIndexes: vi.fn(), USAGE_DB_NAME: 'Chatbot' }));
vi.mock('@shared/calendar-events', () => ({ registerCalendarEventsRoutes: vi.fn() }));
vi.mock('@shared/coach', () => ({ DB_NAME: 'Coach' }));
vi.mock('@shared/flight-traffic', () => ({ ensureFlightTrafficIndexes: vi.fn() }));
vi.mock('@shared/reminders', () => ({ ensureReminderIndexes: vi.fn() }));
vi.mock('@shared/social-follower', () => ({ ensureDigestDeliveryIndexes: vi.fn(), ensurePendingPostIndexes: vi.fn() }));
vi.mock('@shared/transfer-tracker', () => ({ ensureTransferTrackerIndexes: vi.fn() }));
vi.mock('@shared/wolt', () => ({ DB_NAME: 'Wolt' }));
vi.mock('@shared/worldly', () => ({ DB_NAME: 'Worldly' }));
vi.mock('./agent', () => ({ createChatbotCheckpointer }));
vi.mock('./chatbot.config', () => ({ BOT_CONFIG: { id: 'CHATBOT' } }));
vi.mock('./chatbot.service', () => ({ ChatbotService: class {} }));
vi.mock('./chatbot.controller', () => ({
  ChatbotController: class {
    init = controllerInit;
  },
}));
vi.mock('./chatbot-scheduler.service', () => ({
  ChatbotSchedulerService: class {
    init = schedulerInit;
  },
}));
vi.mock('./file-summary', () => ({ FileSummaryService: class {} }));
vi.mock('./secretary', () => ({ ensureSecretaryMessageIndexes: vi.fn(), SecretaryActionService: class {}, SecretaryMessageService: class {} }));

describe('initChatbot()', () => {
  it('should register handlers before telegram polling starts', async () => {
    await expect(initChatbot({} as Express)).resolves.toBeUndefined();

    expect(callOrder).toEqual(['checkpointer', 'provideTelegramBot', 'controller.init']);
    expect(controllerInit).toHaveBeenCalledTimes(1);
    expect(schedulerInit).toHaveBeenCalledTimes(1);
  });
});
