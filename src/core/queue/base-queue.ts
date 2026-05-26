import { Queue } from 'bullmq';
import { env } from 'node:process';
import type { BaseJobData, QueueConfig } from './types';

const DEFAULT_CONFIG = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

export function createQueue<T extends BaseJobData>(config: QueueConfig): Queue<T> {
  const redisUrl = env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL not defined');

  return new Queue<T>(config.name, {
    connection: {
      url: redisUrl,
      maxRetriesPerRequest: null,
    },
    defaultJobOptions: {
      attempts: config.attempts ?? DEFAULT_CONFIG.attempts,
      backoff: config.backoff ?? DEFAULT_CONFIG.backoff,
      removeOnComplete: config.removeOnComplete ?? DEFAULT_CONFIG.removeOnComplete,
      removeOnFail: config.removeOnFail ?? DEFAULT_CONFIG.removeOnFail,
    },
  });
}
