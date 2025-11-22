import cron from 'node-cron';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getHourInTimezone } from '@core/utils';
import { notify } from '@services/notifier';
import { getActiveSubscriptions } from '@shared/worldly';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './worldly.config';
import { WorldlyService } from './worldly.service';

const INTERVAL_HOURS_BY_PRIORITY = [12, 17, 20];

export class WorldlyBotSchedulerService {
  constructor(private readonly worldlyService: WorldlyService) {}

  init(): void {
    cron.schedule(
      `0 ${INTERVAL_HOURS_BY_PRIORITY.join(',')} * * *`,
      async () => {
        await this.handleIntervalFlow();
      },
      { timezone: DEFAULT_TIMEZONE },
    );

    // For testing
    setTimeout(() => {
      // this.handleIntervalFlow();
    }, 8000);
  }

  async handleIntervalFlow(): Promise<void> {
    try {
      const subscriptions = await getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      const chatIds = subscriptions.filter(({ chatId }) => getHourInTimezone(DEFAULT_TIMEZONE) === INTERVAL_HOURS_BY_PRIORITY[0] || chatId === MY_USER_ID).map(({ chatId }) => chatId);
      await Promise.all(chatIds.map(async (chatId) => this.worldlyService.randomGameHandler(chatId)));
    } catch (err) {
      notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
