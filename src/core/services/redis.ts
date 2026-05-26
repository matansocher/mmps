import Redis from 'ioredis';
import { env } from 'node:process';

let connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!connection) {
    const redisUrl = env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL not defined');
    connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }
  return connection;
}
