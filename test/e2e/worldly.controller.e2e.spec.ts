import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from '@src/features/worldly/worldly.config';
import { WorldlyController } from '@src/features/worldly/worldly.controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  getUserLanguage: vi.fn().mockResolvedValue('en'),
  setUserLanguage: vi.fn(),
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
    mocks.getUserLanguage.mockResolvedValue('en');
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
      mocks.saveUserDetails.mockResolvedValue('created');
      mocks.getSubscription.mockResolvedValue(null);

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

      expect(mocks.addSubscription).toHaveBeenCalledTimes(1);
      expect(mocks.updateSubscription).not.toHaveBeenCalled();
      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent[0].payload.text).toContain('Hi');
      expect(sent[0].payload.text).toContain('geography');
    });

    it('reactivates the subscription for a returning user', async () => {
      mocks.saveUserDetails.mockResolvedValue('updated');
      mocks.getSubscription.mockResolvedValue({ chatId: 1, isActive: false });

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

      expect(mocks.updateSubscription).toHaveBeenCalledWith(expect.any(Number), { isActive: true });
      expect(mocks.addSubscription).not.toHaveBeenCalled();
    });
  });

  describe('language selection', () => {
    it('offers both languages and a way back', async () => {
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: BOT_ACTIONS.LANGUAGE }));
      const buttons = testBot.transport.callsByMethod('sendMessage')[0].payload.reply_markup.inline_keyboard.flat();
      expect(buttons.map((button: any) => button.text)).toEqual(['English', 'עברית', 'Back']);
      expect(buttons.map((button: any) => button.callback_data)).toEqual(['set_language|en', 'set_language|he', 'actions']);
    });

    it.each(['en', 'he'] as const)('persists %s and updates the chat command menu', async (language) => {
      mocks.getUserLanguage.mockResolvedValue(language);
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: `set_language|${language}` }));
      expect(mocks.setUserLanguage).toHaveBeenCalledWith(expect.any(Number), language);
      const menu = testBot.transport.callsByMethod('setMyCommands')[0].payload;
      expect(menu.scope.type).toEqual('chat');
      expect(menu.commands.find((command: any) => command.command === 'actions').description).toContain(language === 'he' ? 'פעולות' : 'Actions');
      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent[0].payload.text).toEqual(language === 'he' ? 'השפה שונתה לעברית.' : 'Language set to English.');
      expect(sent[1].payload.text).toEqual(language === 'he' ? 'איך אני יכול לעזור? 👨‍🏫' : 'How can I help? 👨‍🏫');
    });

    it.each(['en', 'he'] as const)('localizes globe, fire mode, contact, and stop replies in %s', async (language) => {
      mocks.getUserLanguage.mockResolvedValue(language);
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/globe' }));
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/fire_mode' }));
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: BOT_ACTIONS.CONTACT }));
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: BOT_ACTIONS.STOP }));
      const texts = testBot.transport.callsByMethod('sendMessage').map(({ payload }) => payload.text);
      expect(texts[0]).toContain(language === 'he' ? 'סובבו' : 'Spin');
      expect(texts[1]).toContain(language === 'he' ? 'ברצף' : 'continuously');
      expect(texts[2]).toContain(language === 'he' ? 'אשמח לעזור' : 'Happy to help');
      expect(texts[3]).toContain(language === 'he' ? 'אפסיק' : 'stop sending');
    });

    it.each(['en', 'he'] as const)('localizes incorrect map, state, and flag answers in %s', async (language) => {
      mocks.getUserLanguage.mockResolvedValue(language);
      mocks.getCountryByName.mockResolvedValue({ name: 'France', hebrewName: 'צרפת', emoji: '🇫🇷' });
      mocks.getStateByName.mockResolvedValue({ name: 'Texas', hebrewName: 'טקסס' });
      for (const action of [BOT_ACTIONS.MAP, BOT_ACTIONS.US_MAP, BOT_ACTIONS.FLAG]) {
        await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: `${action}|wrong|France|game` }));
      }
      const captions = testBot.transport.callsByMethod('editMessageCaption');
      expect(captions[0].payload.caption).toContain(language === 'he' ? 'צרפת' : 'France');
      expect(captions[1].payload.caption).toContain(language === 'he' ? 'טקסס' : 'Texas');
      const text = testBot.transport.callsByMethod('editMessageText')[0].payload.text;
      expect(text).toContain(language === 'he' ? 'התשובה הנכונה' : 'correct answer');
    });

    it('rejects unsupported language callbacks', async () => {
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: 'set_language|fr' }));
      expect(mocks.setUserLanguage).not.toHaveBeenCalled();
    });

    it('uses saved Hebrew on start and explains how to change language', async () => {
      mocks.getUserLanguage.mockResolvedValue('he');
      mocks.saveUserDetails.mockResolvedValue('created');
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));
      const sent = testBot.transport.callsByMethod('sendMessage')[0].payload;
      expect(sent.text).toContain('היי');
      expect(sent.text).toContain('/actions');
      expect(sent.reply_markup.inline_keyboard[0][0].text).toContain('גלובוס');
    });

    it.each(['en', 'he'] as const)('answers an old capital button in the current language (%s)', async (language) => {
      mocks.getUserLanguage.mockResolvedValue(language);
      mocks.getCountryByCapital.mockResolvedValue({ name: 'France', hebrewName: 'צרפת', capital: 'Paris', hebrewCapital: 'פריז', emoji: '🇫🇷' });
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: 'c|פריז|פריז|old' }));
      const text = testBot.transport.callsByMethod('editMessageText')[0].payload.text;
      expect(text).toContain(language === 'he' ? 'נכון!' : 'Correct!');
      expect(text).toContain(language === 'he' ? 'פריז' : 'Paris');
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
      expect(sent[0].payload.text).toContain("haven't played");
    });

    it('records a correct map answer and reacts with 👍', async () => {
      mocks.getCountryByName.mockResolvedValue({ name: 'France', emoji: '🇫🇷', hebrewName: 'צרפת' });

      const data = [BOT_ACTIONS.MAP, 'France', 'France', 'game-1'].join(INLINE_KEYBOARD_SEPARATOR);
      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data }));

      expect(mocks.updateGameLog).toHaveBeenCalledWith({ chatId: expect.any(Number), gameId: 'game-1', selected: 'France' });
      const reactions = testBot.transport.callsByMethod('setMessageReaction');
      expect(reactions.at(-1)?.payload.reaction[0].emoji).toEqual('👍');
    });
  });
});
