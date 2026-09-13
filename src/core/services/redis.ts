import Redis from 'ioredis';
import { env } from 'node:process';

const MAX_RETRIES_PER_REQUEST = 2;
const CONNECT_TIMEOUT_MS = 5_000;
const COMMAND_TIMEOUT_MS = 3_000;
const MAX_RECONNECT_DELAY_MS = 2_000;

let connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!connection) {
    const redisUrl = env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL not defined');
    connection = new Redis(redisUrl, {
      maxRetriesPerRequest: MAX_RETRIES_PER_REQUEST, // fail fast instead of queueing commands indefinitely during an outage
      connectTimeout: CONNECT_TIMEOUT_MS,
      commandTimeout: COMMAND_TIMEOUT_MS,
      enableOfflineQueue: false, // reject commands immediately while disconnected rather than buffering them
      retryStrategy: (times) => Math.min(times * 200, MAX_RECONNECT_DELAY_MS),
    });
    connection.on('error', () => {
      // ioredis emits 'error' on connection loss; swallow to avoid unhandled error crashes — callers handle command rejections
    });
  }
  return connection;
}

export async function closeRedisConnection(): Promise<void> {
  if (!connection) return;
  await connection.quit();
  connection = null;
}
