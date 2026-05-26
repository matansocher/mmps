import type { Queue } from 'bullmq';
import { createQueue } from '@core/queue';
import type { BaseJobData } from '@core/queue';

export const COACH_MATCHES_QUEUE = 'coach-matches-update';

export type CoachMatchesJobData = BaseJobData & {
  readonly customLeagues?: number[];
};

let queueInstance: Queue<CoachMatchesJobData> | null = null;

export function getCoachMatchesQueue(): Queue<CoachMatchesJobData> {
  if (!queueInstance) {
    queueInstance = createQueue<CoachMatchesJobData>({
      name: COACH_MATCHES_QUEUE,
    });
  }
  return queueInstance;
}
