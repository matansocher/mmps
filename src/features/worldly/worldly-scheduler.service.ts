import cron from 'node-cron';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getHourInTimezone } from '@core/utils';
import { notify } from '@services/notifier';
import { provideTelegramBot } from '@services/telegram';
import { getActiveSubscriptions } from '@shared/worldly';
import { getLogicTeaser } from './utils';
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

    cron.schedule('0 9 * * *', () => this.handleLogicTeaser(), { timezone: DEFAULT_TIMEZONE });

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

      const currentHour = getHourInTimezone(DEFAULT_TIMEZONE);
      const chatIds = subscriptions.filter(({ chatId }) => currentHour === INTERVAL_HOURS_BY_PRIORITY[0] || chatId === MY_USER_ID).map(({ chatId }) => chatId);
      await Promise.all(chatIds.map(async (chatId) => this.worldlyService.randomGameHandler(chatId)));
    } catch (err) {
      notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }

  async handleLogicTeaser(): Promise<void> {
    try {
      const subscriptions = await getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      const { text, keyboard } = await getLogicTeaser();
      const bot = provideTelegramBot(BOT_CONFIG);
      const results = await Promise.allSettled(subscriptions.map(({ chatId }) => bot.api.sendMessage(chatId, text, { reply_markup: keyboard })));
      const failed = results.filter(({ status }) => status === 'rejected').length;
      notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.LOGIC_DAILY}`, sent: results.length - failed, failed });
    } catch (err) {
      notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
