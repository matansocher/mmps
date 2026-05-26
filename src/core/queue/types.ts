import type { Job } from 'bullmq';

export type BaseJobData = {
  readonly chatId: number;
  [key: string]: any;
};

export type QueueConfig = {
  readonly name: string;
  readonly attempts?: number;
  readonly backoff?: { type: 'exponential'; delay: number };
  readonly removeOnComplete?: number;
  readonly removeOnFail?: number;
};

export type WorkerConfig<T extends BaseJobData> = {
  readonly queueName: string;
  readonly handler: (job: Job<T>) => Promise<void>;
  readonly concurrency?: number;
  readonly rateLimit?: { max: number; duration: number };
  readonly onCompleted?: (job: Job<T>) => void | Promise<void>;
  readonly onFailed?: (job: Job<T> | undefined, err: Error) => void | Promise<void>;
};
