import type { Worker } from 'bullmq';
import { createWorker } from '@core/queue';
import { notify } from '@services/notifier';
import { BLOCKED_ERROR } from '@services/telegram';
import { getUserDetails, updateSubscription } from '@shared/worldly';
import { WorldlyService } from '../worldly.service';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from '../worldly.config';
import { WORLDLY_QUIZ_QUEUE } from './worldly-quiz.queue';
import type { WorldlyJobData } from './worldly-quiz.queue';

export function createWorldlyQuizWorker(worldlyService: WorldlyService): Worker<WorldlyJobData> {
  return createWorker<WorldlyJobData>({
    queueName: WORLDLY_QUIZ_QUEUE,
    handler: async (job) => {
      const { chatId } = job.data;
      await worldlyService.randomGameHandler(chatId);
    },
    onFailed: async (job, err) => {
      if (!job) return;
      const { chatId } = job.data;
      const userDetails = await getUserDetails(chatId);

      if (err.message.includes(BLOCKED_ERROR)) {
        await updateSubscription(chatId, { isActive: false });
        notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
      } else {
        notify(BOT_CONFIG, { action: `queue - ${ANALYTIC_EVENT_NAMES.ERROR}`, userDetails, error: err });
      }
    },
  });
}
