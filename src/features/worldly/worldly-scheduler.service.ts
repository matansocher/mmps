import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { WorldlyMongoSubscriptionService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { NotifierService } from '@core/notifier';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './worldly.config';
import { WorldlyService } from './worldly.service';

const INTERVAL_HOURS_BY_PRIORITY = [12, 17, 20];

@Injectable()
export class WorldlyBotSchedulerService implements OnModuleInit {
  constructor(
    private readonly worldlyService: WorldlyService,
    private readonly mongoSubscriptionService: WorldlyMongoSubscriptionService,
    private readonly mongoUserService: WorldlyMongoUserService,
    private readonly notifier: NotifierService,
  ) {}

  onModuleInit(): void {
    // this.handleIntervalFlow(); // for testing purposes
  }

  @Cron(`0 ${INTERVAL_HOURS_BY_PRIORITY.join(',')} * * *`, { name: 'worldly-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      const currentHour = new Date().getUTCHours();
      const chatIds = subscriptions.filter(({ chatId }) => currentHour === INTERVAL_HOURS_BY_PRIORITY[0] || chatId === MY_USER_ID).map(({ chatId }) => chatId);
      await Promise.all(
        chatIds.map(async (chatId) => {
          const userDetails = await this.mongoUserService.getUserDetails({ chatId });
          return this.worldlyService.randomGameHandler(chatId, userDetails);
        }),
      );
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
