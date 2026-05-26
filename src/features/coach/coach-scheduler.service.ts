import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { getActiveSubscriptions } from '@shared/coach';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './coach.config';
import { getCoachMatchesQueue } from './queue';

export class CoachBotSchedulerService {
  private readonly logger = new Logger(CoachBotSchedulerService.name);

  init(): void {
    cron.schedule(
      `59 12,23 * * *`,
      async () => {
        await this.enqueueMatchesUpdate();
      },
      { timezone: DEFAULT_TIMEZONE },
    );

    setTimeout(() => {
      this.enqueueMatchesUpdate(); // for testing purposes
    }, 8000);
  }

  private async enqueueMatchesUpdate(): Promise<void> {
    try {
      const subscriptions = await getActiveSubscriptions();
      if (!subscriptions?.length) return;

      const jobs = subscriptions
        .filter((sub) => !!sub.chatId)
        .map((sub) => ({
          name: `matches-${sub.chatId}`,
          data: { chatId: sub.chatId, customLeagues: sub.customLeagues },
        }));

      const queue = getCoachMatchesQueue();
      await queue.addBulk(jobs);
      this.logger.log(`Enqueued ${jobs.length} coach matches jobs`);
    } catch (err) {
      notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
