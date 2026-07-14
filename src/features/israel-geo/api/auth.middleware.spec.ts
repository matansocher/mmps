import type { NextFunction, Request, Response } from 'express';
import { type IsraelGeoAuthenticatedRequest, israelGeoAuthMiddleware } from './auth.middleware';

function createResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('israelGeoAuthMiddleware()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses a local fallback identity without Telegram bot setup', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('MY_USER_ID', '');
    const req = { header: vi.fn() } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    israelGeoAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as IsraelGeoAuthenticatedRequest).israelGeoUser).toEqual({
      telegramUserId: 1,
      username: 'devuser',
      firstName: 'Navigator',
    });
  });

  it('still requires signed Telegram data in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const req = { header: vi.fn().mockReturnValue(undefined) } as unknown as Request;
    const res = createResponse();
    const next = vi.fn() as NextFunction;

    israelGeoAuthMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'missing_init_data' });
  });
});
