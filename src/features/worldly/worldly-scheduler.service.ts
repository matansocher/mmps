import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { WorldlyMongoSubscriptionService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { NotifierService } from '@core/notifier';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './worldly.config';
import { WorldlyService } from './worldly.service';

const HOURS_TO_NOTIFY = [12, 17, 21];

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

  @Cron(`0 ${HOURS_TO_NOTIFY.join(',')} * * *`, { name: 'worldly-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const subscriptions = await this.mongoSubscriptionService.getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      const chatIds = subscriptions.map((subscription) => subscription.chatId);
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
