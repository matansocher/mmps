import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';
import type { WorldlyService } from './worldly.service';

const mocks = vi.hoisted(() => ({
  getActiveSubscriptions: vi.fn(),
  getUserLanguage: vi.fn(),
  sendMessage: vi.fn(),
  getLogicTeaser: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('@shared/worldly', () => ({ getActiveSubscriptions: mocks.getActiveSubscriptions, getUserLanguage: mocks.getUserLanguage }));
vi.mock('@services/telegram', () => ({ provideTelegramBot: () => ({ api: { sendMessage: mocks.sendMessage } }) }));
vi.mock('@services/notifier', () => ({ notify: mocks.notify }));
vi.mock('./utils', () => ({ getLogicTeaser: mocks.getLogicTeaser }));

describe('localized scheduled teasers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getActiveSubscriptions.mockResolvedValue([{ chatId: 1 }, { chatId: 2 }]);
    mocks.getUserLanguage.mockImplementation(async (chatId: number) => (chatId === 1 ? 'en' : 'he'));
    mocks.getLogicTeaser.mockImplementation(async (_day: Date, language: string) => ({ text: language, keyboard: { language } }));
  });

  it('sends each subscriber their saved language using the same date', async () => {
    await new WorldlyBotSchedulerService({} as WorldlyService).handleLogicTeaser();
    expect(mocks.sendMessage).toHaveBeenCalledWith(1, 'en', { reply_markup: { language: 'en' } });
    expect(mocks.sendMessage).toHaveBeenCalledWith(2, 'he', { reply_markup: { language: 'he' } });
    expect(mocks.getLogicTeaser.mock.calls[0][0]).toEqual(mocks.getLogicTeaser.mock.calls[1][0]);
  });
});
