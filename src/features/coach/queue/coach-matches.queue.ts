import { Queue } from 'bullmq';
import { getRedisConnection } from '@core/services';

export const COACH_MATCHES_QUEUE = 'coach-matches-update';

export type CoachMatchesJobData = {
  readonly chatId: number;
  readonly customLeagues?: number[];
};

export const coachMatchesQueue = new Queue<CoachMatchesJobData>(COACH_MATCHES_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
