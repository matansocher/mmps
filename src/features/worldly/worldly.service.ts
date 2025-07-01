import * as fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { WorldlyMongoGameLogService, WorldlyMongoSubscriptionService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { NotifierService } from '@core/notifier';
import { generateRandomString, shuffleArray } from '@core/utils';
import { BLOCKED_ERROR, getInlineKeyboardMarkup } from '@services/telegram';
import { Country, State } from './types';
import { getCapitalDistractors, getCountryMap, getFlagDistractors, getMapDistractors, getMapStateDistractors, getRandomCountry, getRandomState } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './worldly.config';

@Injectable()
export class WorldlyService {
  constructor(
    private readonly subscriptionDB: WorldlyMongoSubscriptionService,
    private readonly gameLogDB: WorldlyMongoGameLogService,
    private readonly userDB: WorldlyMongoUserService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async randomGameHandler(chatId: number): Promise<void> {
    const handlers = [
      (chatId: number) => this.mapHandler(chatId),
      // (chatId: number) => this.USMapHandler(chatId),
      (chatId: number) => this.flagHandler(chatId),
      // (chatId: number) => this.capitalHandler(chatId),
    ];

    const randomGameIndex = Math.floor(Math.random() * handlers.length);

    try {
      await handlers[randomGameIndex](chatId);
    } catch (err) {
      if (err.message.includes(BLOCKED_ERROR)) {
        const userDetails = await this.userDB.getUserDetails({ chatId });
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
        await this.subscriptionDB.updateSubscription(chatId, { isActive: false });
      }
    }
  }

  async mapHandler(chatId: number): Promise<void> {
    const gameFilter = (c: Country) => !!c.geometry;
    const randomCountry = getRandomCountry(gameFilter);
    const imagePath = getCountryMap(randomCountry.name);

    const otherOptions = getMapDistractors(randomCountry);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const gameId = generateRandomString(5);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      options.map((country) => ({ text: country.hebrewName, callback_data: [BOT_ACTIONS.MAP, country.name, randomCountry.name, gameId].join(INLINE_KEYBOARD_SEPARATOR) })),
    );

    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...inlineKeyboardMarkup, caption: 'נחשו את המדינה' });

    await this.gameLogDB.saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.MAP, correct: randomCountry.name });
  }

  async USMapHandler(chatId: number): Promise<void> {
    const gameFilter = (c: State) => !!c.geometry;
    const randomState = getRandomState(gameFilter);
    const imagePath = getCountryMap(randomState.name, true);

    const otherOptions = getMapStateDistractors(randomState);
    const options = shuffleArray([randomState, ...otherOptions]);
    const gameId = generateRandomString(5);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      options.map((state) => ({ text: state.hebrewName, callback_data: [BOT_ACTIONS.US_MAP, state.name, randomState.name, gameId].join(INLINE_KEYBOARD_SEPARATOR) })),
    );

    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...inlineKeyboardMarkup, caption: 'נחשו את המדינה בארצות הברית' });

    await this.gameLogDB.saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.US_MAP, correct: randomState.name });
  }

  async flagHandler(chatId: number): Promise<void> {
    const gameFilter = (c: Country) => !!c.emoji;
    const randomCountry = getRandomCountry(gameFilter);

    const otherOptions = getFlagDistractors(randomCountry, gameFilter);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const gameId = generateRandomString(5);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      options.map((country) => ({ text: country.hebrewName, callback_data: [BOT_ACTIONS.FLAG, country.name, randomCountry.name, gameId].join(INLINE_KEYBOARD_SEPARATOR) })),
    );

    await this.bot.sendMessage(chatId, randomCountry.emoji, { ...inlineKeyboardMarkup });

    await this.gameLogDB.saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.FLAG, correct: randomCountry.name });
  }

  async capitalHandler(chatId: number): Promise<void> {
    const gameFilter = (c: Country) => !!c.capital;
    const randomCountry = getRandomCountry(gameFilter);

    const otherOptions = getCapitalDistractors(randomCountry, gameFilter);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const gameId = generateRandomString(5);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      options.map((country) => ({ text: country.hebrewCapital, callback_data: [BOT_ACTIONS.CAPITAL, country.capital, randomCountry.capital, gameId].join(INLINE_KEYBOARD_SEPARATOR) })),
    );

    const replyText = ['נחשו את עיר הבירה של:', `${randomCountry.emoji} ${randomCountry.hebrewName} ${randomCountry.emoji}`].join(' ');
    await this.bot.sendMessage(chatId, replyText, { ...inlineKeyboardMarkup });

    await this.gameLogDB.saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.CAPITAL, correct: randomCountry.name });
  }
}
