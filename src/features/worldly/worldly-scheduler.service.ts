import fs from 'fs';
import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { WorldlyMongoSubscriptionService } from '@core/mongo/worldly-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { shuffleArray } from '@core/utils';
import { BOTS, getInlineKeyboardMarkup } from '@services/telegram';
import { getCountryMap, getOtherOptions, getRandomCountry } from './utils';
import { ANALYTIC_EVENT_NAMES } from './worldly.config';

const HOURS_TO_NOTIFY = [12, 15, 17, 19, 21, 23];

@Injectable()
export class WorldlyBotSchedulerService implements OnModuleInit {
  constructor(
    private readonly mongoSubscriptionService: WorldlyMongoSubscriptionService,
    private readonly notifier: NotifierBotService,
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

      const randomCountry = getRandomCountry();
      const imagePath = getCountryMap(randomCountry.name);
      if (!imagePath) {
        return;
      }

      const otherOptions = getOtherOptions(randomCountry);
      const inlineKeyboardMarkup = getInlineKeyboardMarkup(
        shuffleArray([
          { text: randomCountry.name, callback_data: `${randomCountry.name} - ${randomCountry.name}` },
          ...otherOptions.map((otherOption) => ({ text: otherOption.name, callback_data: `${otherOption.name} - ${randomCountry.name}` })),
        ]),
      );

      const chatIds = subscriptions.map((subscription) => subscription.chatId);
      await Promise.all(chatIds.map((chatId) => this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...(inlineKeyboardMarkup as any), caption: 'Guess the country' })));
    } catch (err) {
      this.notifier.notify(BOTS.WORLDLY, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
