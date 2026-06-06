import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from '@src/features/worldly/worldly.config';
import { WorldlyController } from '@src/features/worldly/worldly.controller';
import { buildCallbackQueryUpdate, buildTextMessageUpdate, createTestBot, resetUpdateBuilderCounters, simulateUpdate, type TestBot } from './harness';

vi.mock('@services/notifier', () => ({ notify: vi.fn() }));

const mocks = vi.hoisted(() => ({
  saveUserDetails: vi.fn(),
  getSubscription: vi.fn(),
  addSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  getUserGameLogs: vi.fn(),
  updateGameLog: vi.fn(),
  getCountryByName: vi.fn(),
  getCountryByCapital: vi.fn(),
  getStateByName: vi.fn(),
  getAllCountries: vi.fn().mockResolvedValue([]),
  getAllStates: vi.fn().mockResolvedValue([]),
  getUserDetails: vi.fn(),
}));

vi.mock('@shared/worldly', () => mocks);

vi.mock('@src/features/worldly/cache', () => ({
  userPreferencesCacheService: {
    getUserPreferences: vi.fn().mockResolvedValue(null),
    saveUserPreferences: vi.fn().mockResolvedValue(undefined),
  },
}));

function createWorldlyServiceStub() {
  return {
    randomGameHandler: vi.fn().mockResolvedValue(undefined),
    mapHandler: vi.fn().mockResolvedValue(undefined),
    USMapHandler: vi.fn().mockResolvedValue(undefined),
    flagHandler: vi.fn().mockResolvedValue(undefined),
    capitalHandler: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe('WorldlyController E2E', () => {
  let testBot: TestBot;
  let service: ReturnType<typeof createWorldlyServiceStub>;

  beforeEach(() => {
    resetUpdateBuilderCounters();
    vi.clearAllMocks();
    testBot = createTestBot(BOT_CONFIG);
    service = createWorldlyServiceStub();
    const controller = new WorldlyController(service, testBot.bot);
    controller.init();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('/start', () => {
    it('greets a new user and creates a subscription', async () => {
      mocks.saveUserDetails.mockResolvedValue(false);
      mocks.getSubscription.mockResolvedValue(null);

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

      expect(mocks.addSubscription).toHaveBeenCalledTimes(1);
      expect(mocks.updateSubscription).not.toHaveBeenCalled();
      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent[0].payload.text).toContain('היי');
      expect(sent[0].payload.text).toContain('גיאוגרפיה');
    });

    it('reactivates the subscription for a returning user', async () => {
      mocks.saveUserDetails.mockResolvedValue(true);
      mocks.getSubscription.mockResolvedValue({ chatId: 1, isActive: false });

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

      expect(mocks.updateSubscription).toHaveBeenCalledWith(expect.any(Number), { isActive: true });
      expect(mocks.addSubscription).not.toHaveBeenCalled();
    });
  });

  describe('game commands', () => {
    it('routes /random to the random game handler', async () => {
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/random' }));
      expect(service.randomGameHandler).toHaveBeenCalledTimes(1);
    });

    it('routes /flag to the flag handler', async () => {
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/flag' }));
      expect(service.flagHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('/actions', () => {
    it('renders the actions keyboard with a "start" button for inactive subscribers', async () => {
      mocks.getSubscription.mockResolvedValue({ chatId: 1, isActive: false });

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/actions' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(1);
      const buttons = sent[0].payload.reply_markup?.inline_keyboard?.flat();
      const datas = buttons.map((b: any) => b.callback_data).filter(Boolean);
      expect(datas).toEqual(expect.arrayContaining([BOT_ACTIONS.STATISTICS, BOT_ACTIONS.START, BOT_ACTIONS.CONTACT]));
    });

    it('renders the actions keyboard with a "stop" button for active subscribers', async () => {
      mocks.getSubscription.mockResolvedValue({ chatId: 1, isActive: true });

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/actions' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      const datas = sent[0].payload.reply_markup?.inline_keyboard?.flat().map((b: any) => b.callback_data);
      expect(datas).toContain(BOT_ACTIONS.STOP);
    });
  });

  describe('callback_query', () => {
    it('shows a placeholder when the user has no game history', async () => {
      mocks.getUserGameLogs.mockResolvedValue([]);

      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: BOT_ACTIONS.STATISTICS }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent[0].payload.text).toContain('עדיין לא שיחנו');
    });

    it('records a correct map answer and reacts with 👍', async () => {
      mocks.getCountryByName.mockResolvedValue({ emoji: '🇫🇷', hebrewName: 'צרפת' });

      const data = [BOT_ACTIONS.MAP, 'France', 'France', 'game-1'].join(INLINE_KEYBOARD_SEPARATOR);
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data }));

      expect(mocks.updateGameLog).toHaveBeenCalledWith({ chatId: expect.any(Number), gameId: 'game-1', selected: 'France' });
      const reactions = testBot.transport.callsByMethod('setMessageReaction');
      expect(reactions.at(-1)?.payload.reaction[0].emoji).toEqual('👍');
    });
  });
});
