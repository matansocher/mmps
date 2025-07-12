import * as fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Country, State, WorldlyMongoCountryService, WorldlyMongoGameLogService, WorldlyMongoStateService, WorldlyMongoSubscriptionService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { NotifierService } from '@core/notifier';
import { generateRandomString, shuffleArray } from '@core/utils';
import { BLOCKED_ERROR, getInlineKeyboardMarkup } from '@services/telegram';
import { getAreaMap, getCapitalDistractors, getFlagDistractors, getMapDistractors, getMapStateDistractors } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './worldly.config';

@Injectable()
export class WorldlyService {
  constructor(
    private readonly countryDB: WorldlyMongoCountryService,
    private readonly stateDB: WorldlyMongoStateService,
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
    const allCountries = this.countryDB.getAllCountries();
    const randomCountry = this.countryDB.getRandomCountry(gameFilter);
    const imagePath = getAreaMap(allCountries, randomCountry.name);

    const otherOptions = getMapDistractors(allCountries, randomCountry);
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
    const allStates = this.stateDB.getAllStates();
    const randomState = this.stateDB.getRandomState(gameFilter);
    const imagePath = getAreaMap(allStates, randomState.name, true);

    const otherOptions = getMapStateDistractors(allStates, randomState);
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
    const allCountries = this.countryDB.getAllCountries();
    const randomCountry = this.countryDB.getRandomCountry(gameFilter);

    const otherOptions = getFlagDistractors(allCountries, randomCountry, gameFilter);
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
    const allCountries = this.countryDB.getAllCountries();
    const randomCountry = this.countryDB.getRandomCountry(gameFilter);

    const otherOptions = getCapitalDistractors(allCountries, randomCountry, gameFilter);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const gameId = generateRandomString(5);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      // options.map((capital) => ({ text: capital, callback_data: [BOT_ACTIONS.CAPITAL, capital, randomCountry.capital, gameId].join(INLINE_KEYBOARD_SEPARATOR) })),
      options.map((country) => ({ text: country.hebrewCapital, callback_data: [BOT_ACTIONS.CAPITAL, country.hebrewCapital, randomCountry.capital, gameId].join(INLINE_KEYBOARD_SEPARATOR) })),
    );

    const replyText = ['נחשו את עיר הבירה של:', `${randomCountry.emoji} ${randomCountry.hebrewName} ${randomCountry.emoji}`].join(' ');
    await this.bot.sendMessage(chatId, replyText, { ...inlineKeyboardMarkup });

    await this.gameLogDB.saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.CAPITAL, correct: randomCountry.name });
  }
}
