import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { NotifierService } from '@core/notifier';
import { getHourInTimezone } from '@core/utils';
import { getActiveSubscriptions } from '@shared//worldly';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './worldly.config';
import { WorldlyService } from './worldly.service';

const INTERVAL_HOURS_BY_PRIORITY = [12, 17, 20];

@Injectable()
export class WorldlyBotSchedulerService implements OnModuleInit {
  constructor(
    private readonly worldlyService: WorldlyService,
    private readonly notifier: NotifierService,
  ) {}

  onModuleInit(): void {
    // this.handleIntervalFlow(); // for testing purposes
  }

  @Cron(`0 ${INTERVAL_HOURS_BY_PRIORITY.join(',')} * * *`, { name: 'worldly-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const subscriptions = await getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      const chatIds = subscriptions.filter(({ chatId }) => getHourInTimezone(DEFAULT_TIMEZONE) === INTERVAL_HOURS_BY_PRIORITY[0] || chatId === MY_USER_ID).map(({ chatId }) => chatId);
      await Promise.all(chatIds.map(async (chatId) => this.worldlyService.randomGameHandler(chatId)));
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
