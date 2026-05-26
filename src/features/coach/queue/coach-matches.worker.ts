import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import type { Bot } from 'grammy';
import { env } from 'node:process';
import { getDateString, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { BLOCKED_ERROR, sendShortenedMessage } from '@services/telegram';
import { getUserDetails, updateSubscription } from '@shared/coach';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from '../coach.config';
import { CoachService } from '../coach.service';
import { COACH_MATCHES_QUEUE } from './coach-matches.queue';
import type { CoachMatchesJobData } from './coach-matches.queue';

const logger = new Logger('CoachMatchesWorker');

const redisUrl = env.REDIS_URL;
if (!redisUrl) throw new Error('REDIS_URL not defined');

export function createCoachMatchesWorker(coachService: CoachService, bot: Bot): Worker<CoachMatchesJobData> {
  const worker = new Worker<CoachMatchesJobData>(
    COACH_MATCHES_QUEUE,
    async (job) => {
      const { chatId, customLeagues } = job.data;

      const responseText = await coachService.getMatchesSummaryMessage(getDateString(), customLeagues);
      if (!responseText) return;

      const replyText = [`זה המצב הנוכחי של משחקי היום:`, responseText].join('\n\n');
      await sendShortenedMessage(bot, chatId, replyText, { parse_mode: 'Markdown' });
    },
    {
      connection: {
        url: redisUrl,
        maxRetriesPerRequest: null,
      },
      concurrency: 10,
      limiter: {
        max: 25,
        duration: 1000,
      },
    },
  );

  worker.on('completed', (job: Job<CoachMatchesJobData>) => {
    logger.log(`Job ${job.id} completed for chatId ${job.data.chatId}`);
  });

  worker.on('failed', async (job: Job<CoachMatchesJobData> | undefined, err: Error) => {
    if (!job) return;
    const { chatId } = job.data;
    const userDetails = await getUserDetails(chatId);

    if (err.message.includes(BLOCKED_ERROR)) {
      await updateSubscription(chatId, { isActive: false });
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
    } else {
      notify(BOT_CONFIG, { action: `queue - ${ANALYTIC_EVENT_NAMES.ERROR}`, userDetails, error: err });
    }
  });

  logger.log('Coach matches worker started');
  return worker;
}
