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

export async function closeRedisConnection(): Promise<void> {
  if (!connection) return;
  await connection.quit();
  connection = null;
}
