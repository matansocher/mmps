import type { Queue } from 'bullmq';
import { createQueue } from '@core/queue';
import type { BaseJobData } from '@core/queue';

export const WORLDLY_QUIZ_QUEUE = 'worldly-quiz';

export type WorldlyJobData = BaseJobData; // Just chatId for now

let queueInstance: Queue<WorldlyJobData> | null = null;

export function getWorldlyQuizQueue(): Queue<WorldlyJobData> {
  if (!queueInstance) {
    queueInstance = createQueue<WorldlyJobData>({ name: WORLDLY_QUIZ_QUEUE });
  }
  return queueInstance;
}
