import { Queue } from 'bullmq';
import { env } from 'node:process';

export const COACH_MATCHES_QUEUE = 'coach-matches-update';

export type CoachMatchesJobData = {
  readonly chatId: number;
  readonly customLeagues?: number[];
};

let queueInstance: Queue<CoachMatchesJobData> | null = null;

export function getCoachMatchesQueue(): Queue<CoachMatchesJobData> {
  if (!queueInstance) {
    const redisUrl = env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL not defined');

    queueInstance = new Queue<CoachMatchesJobData>(COACH_MATCHES_QUEUE, {
      connection: {
        url: redisUrl,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return queueInstance;
}
