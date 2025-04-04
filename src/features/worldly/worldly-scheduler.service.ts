import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { WorldlyMongoSubscriptionService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { NotifierService } from '@core/notifier';
import { WorldlyService } from '@features/worldly/worldly.service';
import { BOTS, UserDetails } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES } from './worldly.config';

const HOURS_TO_NOTIFY = [12, 15, 17, 19, 21, 23];

@Injectable()
export class WorldlyBotSchedulerService implements OnModuleInit {
  constructor(
    private readonly worldlyService: WorldlyService,
    private readonly mongoSubscriptionService: WorldlyMongoSubscriptionService,
    private readonly mongoUserService: WorldlyMongoUserService,
    private readonly notifier: NotifierService,
    @Inject(BOTS.WORLDLY.id) private readonly bot: TelegramBot,
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

      const handlers = [
        (chatId: number, userDetails: UserDetails) => this.worldlyService.mapHandler(chatId, userDetails),
        (chatId: number, userDetails: UserDetails) => this.worldlyService.flagHandler(chatId, userDetails),
        (chatId: number, userDetails: UserDetails) => this.worldlyService.capitalHandler(chatId, userDetails),
      ];

      const chatIds = subscriptions.map((subscription) => subscription.chatId);
      await Promise.all(
        chatIds.map(async (chatId) => {
          const userDetails = await this.mongoUserService.getUserDetails({ chatId });
          const randomGameIndex = Math.floor(Math.random() * handlers.length);
          return handlers[randomGameIndex](chatId, userDetails);
        }),
      );
    } catch (err) {
      this.notifier.notify(BOTS.WORLDLY, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
