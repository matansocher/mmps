import cron from 'node-cron';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getHourInTimezone, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { getActiveSubscriptions } from '@shared/worldly';
import { getWorldlyQuizQueue } from './queue';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './worldly.config';

const INTERVAL_HOURS_BY_PRIORITY = [12, 17, 20];

export class WorldlyBotSchedulerService {
  private readonly logger = new Logger(WorldlyBotSchedulerService.name);

  init(): void {
    cron.schedule(
      `0 ${INTERVAL_HOURS_BY_PRIORITY.join(',')} * * *`,
      async () => {
        await this.enqueueQuizzes();
      },
      { timezone: DEFAULT_TIMEZONE },
    );

    // For testing
    setTimeout(() => {
      // this.enqueueQuizzes();
    }, 8000);
  }

  async enqueueQuizzes(): Promise<void> {
    try {
      const subscriptions = await getActiveSubscriptions();
      if (!subscriptions?.length) return;

      const currentHour = getHourInTimezone(DEFAULT_TIMEZONE);
      const chatIds = subscriptions.filter(({ chatId }) => currentHour === INTERVAL_HOURS_BY_PRIORITY[0] || chatId === MY_USER_ID).map(({ chatId }) => chatId);

      const jobs = chatIds.map((chatId) => ({
        name: `quiz-${chatId}`,
        data: { chatId },
      }));

      const queue = getWorldlyQuizQueue();
      await queue.addBulk(jobs);
      this.logger.log(`Enqueued ${jobs.length} worldly quiz jobs`);
    } catch (err) {
      notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
