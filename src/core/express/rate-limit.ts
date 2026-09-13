import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getRedisConnection } from '@core/services';
import { getErrorMessage, Logger } from '@core/utils';

const logger = new Logger('rate-limit');

type RateLimitOptions = {
  readonly windowMs: number;
  readonly max: number;
  readonly prefix: string;
  readonly keyGenerator?: (req: Request) => string;
};

type MemoryEntry = {
  count: number;
  expiresAt: number;
};

function defaultKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

// Fixed-window counter. Uses Redis (INCR + EXPIRE) for persistence across
// restarts / multiple instances, and falls back to an in-memory map when Redis
// is unavailable (e.g. local dev without REDIS_URL).
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, prefix, keyGenerator = defaultKey } = options;
  const windowSeconds = Math.ceil(windowMs / 1000);
  const memoryStore = new Map<string, MemoryEntry>();

  async function hitRedis(key: string): Promise<number | null> {
    try {
      const redis = getRedisConnection();
      const redisKey = `ratelimit:${prefix}:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSeconds);
      }
      return count;
    } catch (err) {
      logger.warn(`Redis unavailable, falling back to in-memory rate limiting: ${getErrorMessage(err)}`);
      return null;
    }
  }

  function hitMemory(key: string): number {
    const now = Date.now();
    const entry = memoryStore.get(key);
    if (!entry || entry.expiresAt <= now) {
      memoryStore.set(key, { count: 1, expiresAt: now + windowMs });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = keyGenerator(req);
    const count = (await hitRedis(key)) ?? hitMemory(key);

    if (count > max) {
      res.setHeader('Retry-After', String(windowSeconds));
      res.status(429).json({ error: 'too_many_requests' });
      return;
    }
    next();
  };
}
