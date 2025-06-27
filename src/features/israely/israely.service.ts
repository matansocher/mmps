import * as fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { IsraelyMongoSubscriptionService, IsraelyMongoUserService } from '@core/mongo/israely-mongo';
import { NotifierService } from '@core/notifier';
import { shuffleArray } from '@core/utils';
import { BLOCKED_ERROR, getInlineKeyboardMarkup } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './israely.config';
import { City } from './types';
import { getCityMap, getMapDistractors, getRandomCity } from './utils';

@Injectable()
export class IsraelyService {
  constructor(
    private readonly subscriptionDB: IsraelyMongoSubscriptionService,
    private readonly userDB: IsraelyMongoUserService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async randomGameHandler(chatId: number): Promise<void> {
    try {
      await this.mapHandler(chatId);
    } catch (err) {
      if (err.message.includes(BLOCKED_ERROR)) {
        const userDetails = await this.userDB.getUserDetails({ chatId });
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
        await this.subscriptionDB.updateSubscription(chatId, { isActive: false });
      }
    }
  }

  async mapHandler(chatId: number): Promise<void> {
    const gameFilter = (c: City) => !!c.geometry;
    const randomCity = getRandomCity(gameFilter);
    const imagePath = getCityMap(randomCity.name);

    const otherOptions = getMapDistractors(randomCity);
    const options = shuffleArray([randomCity, ...otherOptions]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((city) => ({ text: city.hebrewName, callback_data: `${BOT_ACTIONS.MAP} - ${city.name} - ${randomCity.name}` })));

    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...inlineKeyboardMarkup, caption: 'נחשו את המדינה' });
  }
}
