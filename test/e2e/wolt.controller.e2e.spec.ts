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
  getSubscriptionById: vi.fn(),
  getRestaurants: vi.fn(),
}));

vi.mock('@shared/wolt', () => ({
  saveUserDetails: mocks.saveUserDetails,
  getActiveSubscriptions: mocks.getActiveSubscriptions,
  addSubscription: mocks.addSubscription,
  archiveSubscription: mocks.archiveSubscription,
  getSubscriptionById: mocks.getSubscriptionById,
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

  describe('database read errors', () => {
    beforeEach(() => {
      mocks.getActiveSubscriptions.mockRejectedValue(new Error('mongo down'));
    });

    it('asks to retry /list instead of saying there are no alerts', async () => {
      await expect(simulateUpdate(testBot, buildTextMessageUpdate({ text: '/list' }))).rejects.toThrow('mongo down');

      const texts = testBot.transport.callsByMethod('sendMessage').map((c) => c.payload.text);
      expect(texts).toEqual([expect.stringContaining('לנסות שוב')]);
    });

    it('keeps the remove button and does not claim the alert is gone', async () => {
      await expect(simulateUpdate(testBot, buildCallbackQueryUpdate({ data: [BOT_ACTIONS.REMOVE, '65a1b2c3d4e5f6a7b8c9d0e1'].join(INLINE_KEYBOARD_SEPARATOR) }))).rejects.toThrow('mongo down');

      const texts = testBot.transport.callsByMethod('sendMessage').map((c) => c.payload.text);
      expect(texts).toEqual([expect.stringContaining('לנסות שוב')]);
      expect(testBot.transport.callsByMethod('editMessageReplyMarkup')).toHaveLength(0);
      expect(mocks.archiveSubscription).not.toHaveBeenCalled();
    });

    it('asks to retry adding instead of subscribing past the limit', async () => {
      await expect(simulateUpdate(testBot, buildCallbackQueryUpdate({ data: [BOT_ACTIONS.ADD, 'venue-1'].join(INLINE_KEYBOARD_SEPARATOR) }))).rejects.toThrow('mongo down');

      const texts = testBot.transport.callsByMethod('sendMessage').map((c) => c.payload.text);
      expect(texts).toEqual([expect.stringContaining('לנסות שוב')]);
      expect(mocks.addSubscription).not.toHaveBeenCalled();
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
        // times are shown in Israel time (UTC+2 in winter), not in the server's timezone
        { restaurant: 'Pizza Place', createdAt: new Date('2024-01-01T08:30:00Z') },
        { restaurant: 'Burger Joint', createdAt: new Date('2024-01-01T09:05:00Z') },
      ]);

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/list' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(2);
      expect(sent.map((c) => c.payload.text)).toEqual(expect.arrayContaining(['10:30 - Pizza Place\n⏳ ההתראה פעילה עד 14:30', '11:05 - Burger Joint\n⏳ ההתראה פעילה עד 15:05']));
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
      expect(sent[0].payload.text).toContain('לינק');
      expect(sent[0].payload.reply_markup).toBeUndefined();
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

    describe('venue ids', () => {
      const VENUE_ID = '5f1a2b3c4d5e6f7a8b9c0d1e';
      const SUBSCRIPTION_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
      const branches = [
        { id: 'other-branch', name: 'Shila - Sharon Cohen', isOnline: true, photo: 'other.jpg', link: 'https://wolt.com/other' },
        { id: VENUE_ID, name: 'Shila - Sharon Cohen', isOnline: false, photo: 'shila.jpg', link: 'https://wolt.com/shila' },
      ];

      it('puts the venue id, not the name, in the add button', async () => {
        mocks.getRestaurants.mockResolvedValue([{ id: VENUE_ID, name: 'Pizza With A Very Long Name That Would Not Fit', isOnline: false, link: 'l' }]);

        await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'pizza' }));

        const [button] = testBot.transport.callsByMethod('sendMessage')[0].payload.reply_markup.inline_keyboard.flat();
        expect(button.callback_data).toEqual([BOT_ACTIONS.ADD, VENUE_ID].join(INLINE_KEYBOARD_SEPARATOR));
      });

      it('subscribes to the exact branch picked, even when its name contains the separator', async () => {
        mocks.getActiveSubscriptions.mockResolvedValue([]);
        mocks.getRestaurants.mockResolvedValue(branches);

        await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: [BOT_ACTIONS.ADD, VENUE_ID].join(INLINE_KEYBOARD_SEPARATOR) }));

        expect(mocks.addSubscription).toHaveBeenCalledWith(expect.any(Number), 'Shila - Sharon Cohen', 'shila.jpg', VENUE_ID, expect.any(Date));
        expect(testBot.transport.callsByMethod('sendMessage')[0].payload.text).toContain('אני אתריע');
      });

      it('still handles old add buttons that carry the name', async () => {
        mocks.getActiveSubscriptions.mockResolvedValue([]);
        mocks.getRestaurants.mockResolvedValue([branches[1]]);

        await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: [BOT_ACTIONS.ADD, 'Shila - Sharon Cohen'].join(INLINE_KEYBOARD_SEPARATOR) }));

        expect(mocks.addSubscription).toHaveBeenCalledWith(expect.any(Number), 'Shila - Sharon Cohen', 'shila.jpg', VENUE_ID, expect.any(Date));
      });

      it('puts the subscription id in the /list remove button and removes by it', async () => {
        const subscription = { _id: { toString: () => SUBSCRIPTION_ID }, restaurant: 'Shila - Sharon Cohen', createdAt: new Date() };
        mocks.getActiveSubscriptions.mockResolvedValue([subscription]);

        await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/list' }));
        const [button] = testBot.transport.callsByMethod('sendMessage')[0].payload.reply_markup.inline_keyboard.flat();
        expect(button.callback_data).toEqual([BOT_ACTIONS.REMOVE, SUBSCRIPTION_ID].join(INLINE_KEYBOARD_SEPARATOR));

        await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: button.callback_data }));

        expect(mocks.archiveSubscription).toHaveBeenCalledWith(expect.any(Number), 'Shila - Sharon Cohen', false);
      });

      it('does not echo the id when the subscription is already gone', async () => {
        mocks.getActiveSubscriptions.mockResolvedValue([]);

        await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: [BOT_ACTIONS.REMOVE, SUBSCRIPTION_ID].join(INLINE_KEYBOARD_SEPARATOR) }));

        expect(mocks.archiveSubscription).not.toHaveBeenCalled();
        expect(testBot.transport.callsByMethod('sendMessage')[0].payload.text).not.toContain(SUBSCRIPTION_ID);
      });
    });

    describe('extend', () => {
      const SUBSCRIPTION_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
      const expiredSubscription = { chatId: 123_456, restaurant: 'Pizza Hut', restaurantId: 'venue-1', isActive: false };
      const extendData = (hours: number) => [BOT_ACTIONS.EXTEND, SUBSCRIPTION_ID, hours].join(INLINE_KEYBOARD_SEPARATOR);

      beforeEach(() => {
        mocks.getActiveSubscriptions.mockResolvedValue([]);
        mocks.getRestaurants.mockResolvedValue([{ id: 'venue-1', name: 'Pizza Hut', isOnline: false, photo: 'p.jpg', link: 'l' }]);
      });

      it('renews the expired subscription for the chosen hours and removes the buttons', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
        mocks.getSubscriptionById.mockResolvedValue(expiredSubscription);

        await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: extendData(1) }));
        vi.useRealTimers();

        expect(mocks.getSubscriptionById).toHaveBeenCalledWith(SUBSCRIPTION_ID);
        expect(mocks.addSubscription).toHaveBeenCalledWith(123_456, 'Pizza Hut', 'p.jpg', 'venue-1', new Date('2024-01-01T11:00:00Z'));
        expect(testBot.transport.callsByMethod('sendMessage')[0].payload.text).toContain('הארכתי את ההתראה עד 13:00');
        expect(testBot.transport.callsByMethod('editMessageReplyMarkup')).toHaveLength(1);
      });

      it('rejects hours that are not offered', async () => {
        await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: extendData(48) }));

        expect(mocks.getSubscriptionById).not.toHaveBeenCalled();
        expect(mocks.addSubscription).not.toHaveBeenCalled();
      });

      it("does not extend another user's subscription", async () => {
        mocks.getSubscriptionById.mockResolvedValue({ ...expiredSubscription, chatId: 999 });

        await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: extendData(4) }));

        expect(mocks.addSubscription).not.toHaveBeenCalled();
        expect(testBot.transport.callsByMethod('sendMessage')[0].payload.text).toContain('לא הצלחתי להאריך');
      });

      it('keeps the buttons when the user is at the subscription limit', async () => {
        mocks.getSubscriptionById.mockResolvedValue(expiredSubscription);
        mocks.getActiveSubscriptions.mockResolvedValue(Array.from({ length: 6 }, (_, i) => ({ restaurant: `R${i}` })));

        await simulateUpdate(testBot, buildCallbackQueryUpdate({ data: extendData(4) }));

        expect(mocks.addSubscription).not.toHaveBeenCalled();
        expect(testBot.transport.callsByMethod('editMessageReplyMarkup')).toHaveLength(0);
      });
    });
  });
});
