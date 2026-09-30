import type { TelegramBotConfig } from '../types';

const { setMyCommands, start } = vi.hoisted(() => ({ setMyCommands: vi.fn(), start: vi.fn() }));

vi.mock('@grammyjs/hydrate', () => ({ hydrate: vi.fn(() => vi.fn()) }));
vi.mock('grammy', () => ({
  Bot: class {
    use = vi.fn();
    catch = vi.fn();
    api = { setMyCommands };
    start = start;
    stop = vi.fn();
  },
}));

const BOT_CONFIG = {
  id: 'TEST',
  name: 'Test Bot',
  token: 'TEST_TELEGRAM_BOT_TOKEN',
  forceLocal: true,
  commands: { a: { command: '/a', description: 'd' } },
} as unknown as TelegramBotConfig;

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('provideTelegramBot()', () => {
  const unhandled = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    setMyCommands.mockReset();
    start.mockReset();
    unhandled.mockReset();
    process.env.TEST_TELEGRAM_BOT_TOKEN = 'token';
    process.on('unhandledRejection', unhandled);
  });

  afterEach(() => {
    process.off('unhandledRejection', unhandled);
    delete process.env.TEST_TELEGRAM_BOT_TOKEN;
  });

  it('should contain setMyCommands and polling rejections instead of leaking them to the process', async () => {
    setMyCommands.mockRejectedValue(new Error('401 Unauthorized'));
    start.mockRejectedValue(new Error('409 Conflict'));
    const { provideTelegramBot } = await import('./provide-telegram-bot');

    provideTelegramBot(BOT_CONFIG);
    await flush();

    expect(setMyCommands).toHaveBeenCalledWith([{ command: 'a', description: 'd' }]);
    expect(start).toHaveBeenCalledTimes(1);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('should memoize the bot and start polling only once', async () => {
    setMyCommands.mockResolvedValue(true);
    start.mockReturnValue(new Promise(() => {}));
    const { provideTelegramBot } = await import('./provide-telegram-bot');

    expect(provideTelegramBot(BOT_CONFIG)).toBe(provideTelegramBot(BOT_CONFIG));
    expect(start).toHaveBeenCalledTimes(1);
  });
});
