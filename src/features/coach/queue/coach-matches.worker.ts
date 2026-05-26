import type { Worker } from 'bullmq';
import type { Bot } from 'grammy';
import { createWorker } from '@core/queue';
import { getDateString } from '@core/utils';
import { notify } from '@services/notifier';
import { BLOCKED_ERROR, sendShortenedMessage } from '@services/telegram';
import { getUserDetails, updateSubscription } from '@shared/coach';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from '../coach.config';
import { CoachService } from '../coach.service';
import { COACH_MATCHES_QUEUE } from './coach-matches.queue';
import type { CoachMatchesJobData } from './coach-matches.queue';

export function createCoachMatchesWorker(coachService: CoachService, bot: Bot): Worker<CoachMatchesJobData> {
  return createWorker<CoachMatchesJobData>({
    queueName: COACH_MATCHES_QUEUE,
    handler: async (job) => {
      const { chatId, customLeagues } = job.data;

      const responseText = await coachService.getMatchesSummaryMessage(getDateString(), customLeagues);
      if (!responseText) return;

      const replyText = [`זה המצב הנוכחי של משחקי היום:`, responseText].join('\n\n');
      await sendShortenedMessage(bot, chatId, replyText, { parse_mode: 'Markdown' });
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
