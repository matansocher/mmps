import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { createTelegramMiniAppAuthMiddleware, type VerifiedTelegramInitData, verifyTelegramInitData } from '.';

const BOT_TOKEN = 'test-bot-token';
const NOW = new Date('2026-08-11T10:00:00.000Z');

function createInitData(user: unknown, authDate = Math.floor(NOW.getTime() / 1000), botToken = BOT_TOKEN): string {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'test-query',
    user: typeof user === 'string' ? user : JSON.stringify(user),
  });
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex'));
  return params.toString();
}

describe('verifyTelegramInitData()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the typed user data for a valid signature', () => {
    expect(verifyTelegramInitData(createInitData({ id: 12345, username: 'guz', first_name: 'Guz', last_name: 'Man' }), BOT_TOKEN)).toEqual({
      telegramUserId: 12345,
      username: 'guz',
      firstName: 'Guz',
      lastName: 'Man',
      authDate: Math.floor(NOW.getTime() / 1000),
    });
  });

  it.each([
    { name: 'missing hash', initData: 'auth_date=1&user=%7B%22id%22%3A1%7D' },
    { name: 'non-hex hash', initData: `auth_date=1&user=%7B%22id%22%3A1%7D&hash=${'z'.repeat(64)}` },
    { name: 'short hash', initData: 'auth_date=1&user=%7B%22id%22%3A1%7D&hash=abcd' },
    { name: 'malformed user JSON', initData: createInitData('{not-json') },
    { name: 'missing user id', initData: createInitData({ username: 'guz' }) },
    { name: 'non-numeric user id', initData: createInitData({ id: '12345' }) },
  ])('returns null for $name', ({ initData }) => {
    expect(verifyTelegramInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('returns null for an expired auth date', () => {
    const expired = Math.floor(NOW.getTime() / 1000) - 86_401;
    expect(verifyTelegramInitData(createInitData({ id: 1 }, expired), BOT_TOKEN)).toBeNull();
  });

  it('returns null for a future auth date', () => {
    const future = Math.floor(NOW.getTime() / 1000) + 1;
    expect(verifyTelegramInitData(createInitData({ id: 1 }, future), BOT_TOKEN)).toBeNull();
  });

  it('returns null for an invalid signature', () => {
    expect(verifyTelegramInitData(createInitData({ id: 1 }, undefined, 'different-token'), BOT_TOKEN)).toBeNull();
  });
});

describe('createTelegramMiniAppAuthMiddleware()', () => {
  type TestUser = {
    readonly telegramUserId: number;
    readonly chatId: number;
    readonly username?: string;
  };

  type TestRequest = Request & {
    testUser?: TestUser;
  };

  let request: TestRequest;
  let response: Response;
  let next: NextFunction;
  let headers: Record<string, string | undefined>;
  let botToken: string | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv('NODE_ENV', 'production');
    headers = {};
    botToken = BOT_TOKEN;
    request = {
      header: vi.fn((name: string) => headers[name]),
    } as unknown as TestRequest;
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    next = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  function createMiddleware(defaultDevUserId?: string) {
    return createTelegramMiniAppAuthMiddleware<TestUser>({
      devHeader: 'X-Test-Dev-User',
      defaultDevUserId,
      botTokenName: 'TEST_BOT_TOKEN',
      getBotToken: () => botToken,
      loggerName: 'test:api:auth',
      mapUser: (verified: VerifiedTelegramInitData) => ({
        telegramUserId: verified.telegramUserId,
        chatId: verified.telegramUserId,
        username: verified.username,
      }),
      assignUser: (req, user) => {
        (req as TestRequest).testUser = user;
      },
    });
  }

  it('assigns a verified production user and calls next', () => {
    headers['X-Telegram-Init-Data'] = createInitData({ id: 12345, username: 'guz' });

    createMiddleware()(request, response, next);

    expect(request.testUser).toEqual({ telegramUserId: 12345, chatId: 12345, username: 'guz' });
    expect(next).toHaveBeenCalledOnce();
  });

  it.each([
    { name: 'missing init data', expectedStatus: 401, expectedError: 'missing_init_data', setup: () => undefined },
    {
      name: 'missing bot token',
      expectedStatus: 500,
      expectedError: 'bot_not_configured',
      setup: () => {
        headers['X-Telegram-Init-Data'] = createInitData({ id: 1 });
        botToken = undefined;
      },
    },
    {
      name: 'invalid init data',
      expectedStatus: 401,
      expectedError: 'invalid_init_data',
      setup: () => {
        headers['X-Telegram-Init-Data'] = 'invalid';
      },
    },
  ])('rejects $name', ({ expectedStatus, expectedError, setup }) => {
    setup();

    createMiddleware()(request, response, next);

    expect(response.status).toHaveBeenCalledWith(expectedStatus);
    expect(response.json).toHaveBeenCalledWith({ error: expectedError });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses the feature-specific development header', () => {
    vi.stubEnv('NODE_ENV', 'development');
    headers['X-Test-Dev-User'] = '6789';

    createMiddleware()(request, response, next);

    expect(request.testUser).toEqual({ telegramUserId: 6789, chatId: 6789, username: 'devuser' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects an invalid development user', () => {
    vi.stubEnv('NODE_ENV', 'development');
    headers['X-Test-Dev-User'] = 'invalid';

    createMiddleware()(request, response, next);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: 'invalid_dev_user' });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses the configured default development user', () => {
    vi.stubEnv('NODE_ENV', 'development');

    createMiddleware('42')(request, response, next);

    expect(request.testUser).toEqual({ telegramUserId: 42, chatId: 42, username: 'devuser' });
    expect(next).toHaveBeenCalledOnce();
  });
});
