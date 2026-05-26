import { Worker } from 'bullmq';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import type { BaseJobData, WorkerConfig } from './types';

const DEFAULT_CONCURRENCY = 10;
const DEFAULT_RATE_LIMIT = { max: 25, duration: 1000 }; // 25 msg/sec like coach

export function createWorker<T extends BaseJobData>(config: WorkerConfig<T>): Worker<T> {
  const redisUrl = env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL not defined');

  const logger = new Logger(`${config.queueName}-worker`);

  const worker = new Worker<T>(config.queueName, config.handler, {
    connection: {
      url: redisUrl,
      maxRetriesPerRequest: null,
    },
    concurrency: config.concurrency ?? DEFAULT_CONCURRENCY,
    limiter: config.rateLimit ?? DEFAULT_RATE_LIMIT,
  });

  worker.on('completed', (job) => {
    logger.log(`Job ${job.id} completed for chatId ${job.data.chatId}`);
    if (config.onCompleted) {
      config.onCompleted(job);
    }
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
    if (config.onFailed) {
      config.onFailed(job, err);
    }
  });

  logger.log(`Worker started for queue ${config.queueName}`);
  return worker;
}
