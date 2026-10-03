import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from '@src/features/wolt/wolt.config';
import { WoltController } from '@src/features/wolt/wolt.controller';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCallbackQueryUpdate, buildTextMessageUpdate, createTestBot, resetUpdateBuilderCounters, simulateUpdate, type TestBot } from './harness';

vi.mock('@services/notifier', () => ({ notify: vi.fn() }));

const mocks = vi.hoisted(() => ({
  saveUserDetails: vi.fn(),
  getActiveSubscriptions: vi.fn(),
  addSubscription: vi.fn(),
  archiveSubscription: vi.fn(),
  getRestaurants: vi.fn(),
}));

vi.mock('@shared/wolt', () => ({
  saveUserDetails: mocks.saveUserDetails,
  getActiveSubscriptions: mocks.getActiveSubscriptions,
  addSubscription: mocks.addSubscription,
  archiveSubscription: mocks.archiveSubscription,
}));

vi.mock('@src/features/wolt/restaurants.service', () => ({
  restaurantsService: { getRestaurants: mocks.getRestaurants },
}));

vi.mock('@src/features/wolt/utils/rank-restaurants-by-relevance', () => ({
  rankRestaurantsByRelevance: vi.fn(async (restaurants: unknown[]) => restaurants),
}));

describe('WoltController E2E', () => {
  let testBot: TestBot;

  beforeEach(() => {
    resetUpdateBuilderCounters();
    vi.clearAllMocks();
    testBot = createTestBot(BOT_CONFIG);
    const controller = new WoltController(testBot.bot);
    controller.init();
  });

  describe('/start', () => {
    it('greets a new user with the long welcome', async () => {
      mocks.saveUserDetails.mockResolvedValue('created');

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

      expect(mocks.saveUserDetails).toHaveBeenCalledTimes(1);
      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(1);
      expect(sent[0].payload.text).toContain('שלום');
      expect(sent[0].payload.text).toContain('בוולט');
    });

    it('greets a returning user with the short reply', async () => {
      mocks.saveUserDetails.mockResolvedValue('updated');

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent[0].payload.text).toContain('מעולה');
    });
  });

  describe('/contact', () => {
    it('replies with the contact message', async () => {
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/contact' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(1);
      expect(sent[0].payload.text).toContain('בשמחה');
    });
  });

  describe('/list', () => {
    it('tells the user when there are no subscriptions', async () => {
      mocks.getActiveSubscriptions.mockResolvedValue([]);

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/list' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(1);
      expect(sent[0].payload.text).toEqual('אין לך התראות פתוחות');
    });

    it('renders one message per active subscription with a remove button', async () => {
      mocks.getActiveSubscriptions.mockResolvedValue([
        { restaurant: 'Pizza Place', createdAt: new Date('2024-01-01T10:30:00') },
        { restaurant: 'Burger Joint', createdAt: new Date('2024-01-01T11:05:00') },
      ]);

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/list' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(2);
      expect(sent.map((c) => c.payload.text)).toEqual(expect.arrayContaining(['10:30 - Pizza Place', '11:05 - Burger Joint']));
      for (const call of sent) {
        const buttons = call.payload.reply_markup?.inline_keyboard?.flat();
        expect(buttons).toHaveLength(1);
        expect(buttons[0].callback_data.startsWith(`${BOT_ACTIONS.REMOVE}${INLINE_KEYBOARD_SEPARATOR}`)).toBe(true);
      }
    });
  });

  describe('text search', () => {
    it('rejects Hebrew queries with a hint to use English', async () => {
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'פיצה' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(1);
      expect(sent[0].payload.text).toContain('באנגלית');
      expect(mocks.getRestaurants).not.toHaveBeenCalled();
    });

    it('replies with no-results message when nothing matches', async () => {
      mocks.getRestaurants.mockResolvedValue([{ name: 'Pizza Hut', isOnline: true }]);

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'sushi' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent[0].payload.text).toContain('לא מצאתי');
    });

    it('returns a keyboard of matched restaurants', async () => {
      mocks.getRestaurants.mockResolvedValue([
        { id: '1', name: 'Pizza Hut', isOnline: true, link: 'https://wolt.com/pizza-hut' },
        { id: '2', name: 'Pizza Place', isOnline: false, link: 'https://wolt.com/pizza-place' },
      ]);

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'pizza' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(1);
      const buttons = sent[0].payload.reply_markup?.inline_keyboard?.flat();
      expect(buttons).toHaveLength(2);
      expect(buttons.every((b: any) => b.callback_data.startsWith(`${BOT_ACTIONS.ADD}${INLINE_KEYBOARD_SEPARATOR}`))).toBe(true);
    });
  });

  describe('pagination', () => {
    const manyPizzas = Array.from({ length: 10 }, (_, i) => ({ id: `${i}`, name: `Pizza ${i}`, isOnline: false, link: `https://wolt.com/pizza-${i}` }));

    it('pages through stored results using a short search id', async () => {
      mocks.getRestaurants.mockResolvedValue(manyPizzas);

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'a very long search query that mentions pizza and a lot of other words' }));

      const buttons = testBot.transport.callsByMethod('sendMessage')[0].payload.reply_markup.inline_keyboard.flat();
      const nextPage = buttons.find((b: any) => b.callback_data.startsWith(BOT_ACTIONS.CHANGE_PAGE));
      expect(Buffer.byteLength(nextPage.callback_data)).toBeLessThanOrEqual(64);

      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: nextPage.callback_data }));

      expect(testBot.transport.callsByMethod('answerCallbackQuery')).toHaveLength(1);
      const edited = testBot.transport.callsByMethod('editMessageReplyMarkup')[0].payload.reply_markup.inline_keyboard.flat();
      expect(edited.map((b: any) => b.text)).toEqual(expect.arrayContaining(['Pizza 7 - 🛑 לא זמין 🛑', 'Pizza 9 - 🛑 לא זמין 🛑']));
    });

    it('asks to search again when the stored search is gone', async () => {
      mocks.getActiveSubscriptions.mockResolvedValue([]);

      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: [BOT_ACTIONS.CHANGE_PAGE, 'missing', 2].join(INLINE_KEYBOARD_SEPARATOR) }));

      const answers = testBot.transport.callsByMethod('answerCallbackQuery');
      expect(answers).toHaveLength(1);
      expect(answers[0].payload.text).toContain('לחפש שוב');
      expect(mocks.getRestaurants).not.toHaveBeenCalled();
    });
  });

  describe('callback_query', () => {
    it('removes an existing subscription and reacts', async () => {
      mocks.getActiveSubscriptions.mockResolvedValue([{ restaurant: 'Pizza Hut', createdAt: new Date() }]);
      mocks.archiveSubscription.mockResolvedValue(undefined);

      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: [BOT_ACTIONS.REMOVE, 'Pizza Hut'].join(INLINE_KEYBOARD_SEPARATOR) }));

      expect(mocks.archiveSubscription).toHaveBeenCalledWith(expect.any(Number), 'Pizza Hut', false);
      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent[0].payload.text).toContain('הורדתי את ההתראה');
    });

    it('answers with a friendly fallback for unknown actions', async () => {
      mocks.getActiveSubscriptions.mockResolvedValue([]);

      await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: ['nope', 'whatever'].join(INLINE_KEYBOARD_SEPARATOR) }));

      const answers = testBot.transport.callsByMethod('answerCallbackQuery');
      expect(answers).toHaveLength(1);
      expect(answers[0].payload.text).toContain('לא הבנתי');
    });
  });
});
