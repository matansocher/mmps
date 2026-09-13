import type { NextFunction, Request, Response } from 'express';
import { createRateLimiter } from './rate-limit';

vi.mock('@core/services', () => ({
  getRedisConnection: vi.fn(() => {
    throw new Error('no redis');
  }),
}));

function mockReq(ip = '1.2.3.4'): Request {
  return { ip, socket: { remoteAddress: ip } } as unknown as Request;
}

function mockRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader: vi.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('createRateLimiter() (in-memory fallback)', () => {
  it('should allow requests up to the max', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 3, prefix: 'test-allow' });
    const next = vi.fn() as unknown as NextFunction;

    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      await limiter(mockReq(), res, next);
      expect(res.statusCode).toEqual(200);
    }
    expect(next).toHaveBeenCalledTimes(3);
  });

  it('should reject with 429 once the max is exceeded', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, prefix: 'test-reject' });
    const next = vi.fn() as unknown as NextFunction;

    await limiter(mockReq(), mockRes(), next);
    await limiter(mockReq(), mockRes(), next);
    const res = mockRes();
    await limiter(mockReq(), res, next);

    expect(res.statusCode).toEqual(429);
    expect(res.body).toEqual({ error: 'too_many_requests' });
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should track different IPs independently', async () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, prefix: 'test-ip' });
    const next = vi.fn() as unknown as NextFunction;

    const resA = mockRes();
    await limiter(mockReq('1.1.1.1'), resA, next);
    const resB = mockRes();
    await limiter(mockReq('2.2.2.2'), resB, next);

    expect(resA.statusCode).toEqual(200);
    expect(resB.statusCode).toEqual(200);
  });

  it('should reset the count after the window expires', async () => {
    vi.useFakeTimers();
    const limiter = createRateLimiter({ windowMs: 1000, max: 1, prefix: 'test-window' });
    const next = vi.fn() as unknown as NextFunction;

    const first = mockRes();
    await limiter(mockReq(), first, next);
    expect(first.statusCode).toEqual(200);

    const blocked = mockRes();
    await limiter(mockReq(), blocked, next);
    expect(blocked.statusCode).toEqual(429);

    vi.advanceTimersByTime(1001);

    const afterWindow = mockRes();
    await limiter(mockReq(), afterWindow, next);
    expect(afterWindow.statusCode).toEqual(200);

    vi.useRealTimers();
  });
});
