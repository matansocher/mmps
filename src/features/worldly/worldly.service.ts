import * as fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { NotifierService } from '@core/notifier';
import { shuffleArray } from '@core/utils';
import { getInlineKeyboardMarkup, UserDetails } from '@services/telegram';
import { Country } from './types';
import { getAreaMap, getCapitalDistractors, getContinents, getFlagDistractors, getMapDistractors, getMapStateDistractors, getRandomContinent, getRandomCountry, getRandomState } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './worldly.config';

@Injectable()
export class WorldlyService {
  constructor(
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  async randomGameHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const handlers = [
      (chatId: number, userDetails: UserDetails) => this.mapHandler(chatId, userDetails),
      // (chatId: number, userDetails: UserDetails) => this.USMapHandler(chatId, userDetails),
      (chatId: number, userDetails: UserDetails) => this.flagHandler(chatId, userDetails),
      // (chatId: number, userDetails: UserDetails) => this.capitalHandler(chatId, userDetails),
      (chatId: number, userDetails: UserDetails) => this.continentMapHandler(chatId, userDetails),
    ];

    const randomGameIndex = Math.floor(Math.random() * handlers.length);
    await handlers[randomGameIndex](chatId, userDetails);
  }

  async mapHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const gameFilter = (c: Country) => !!c.geometry;
    const randomCountry = getRandomCountry(gameFilter);
    const imagePath = getAreaMap(randomCountry.name);

    const otherOptions = getMapDistractors(randomCountry);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((country) => ({ text: country.hebrewName, callback_data: `${BOT_ACTIONS.MAP} - ${country.name} - ${randomCountry.name}` })));

    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...(inlineKeyboardMarkup as any), caption: 'נחשו את המדינה' });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MAP }, userDetails);
  }

  async USMapHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const randomState = getRandomState();
    const imagePath = getAreaMap(randomState.name, true);

    const otherOptions = getMapStateDistractors(randomState);
    const options = shuffleArray([randomState, ...otherOptions]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((state) => ({ text: state.hebrewName, callback_data: `${BOT_ACTIONS.US_MAP} - ${state.name} - ${randomState.name}` })));

    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...(inlineKeyboardMarkup as any), caption: 'נחשו את המדינה בארצות הברית' });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.US_MAP }, userDetails);
  }

  async flagHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const gameFilter = (c: Country) => !!c.emoji;
    const randomCountry = getRandomCountry(gameFilter);

    const otherOptions = getFlagDistractors(randomCountry, gameFilter);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((country) => ({ text: country.hebrewName, callback_data: `${BOT_ACTIONS.FLAG} - ${country.name} - ${randomCountry.name}` })));

    await this.bot.sendMessage(chatId, randomCountry.emoji, { ...(inlineKeyboardMarkup as any) });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.FLAG }, userDetails);
  }

  async capitalHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const gameFilter = (c: Country) => !!c.capital;
    const randomCountry = getRandomCountry(gameFilter);

    const otherOptions = getCapitalDistractors(randomCountry, gameFilter);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      options.map((country) => ({ text: country.hebrewCapital, callback_data: `${BOT_ACTIONS.CAPITAL} - ${country.capital} - ${randomCountry.capital}` })),
    );

    const replyText = ['נחשו את עיר הבירה של:', `${randomCountry.emoji} ${randomCountry.hebrewName} ${randomCountry.emoji}`].join(' ');
    await this.bot.sendMessage(chatId, replyText, { ...(inlineKeyboardMarkup as any) });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CAPITAL }, userDetails);
  }

  async continentMapHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const randomContinent = getRandomContinent();
    const imagePath = getAreaMap(randomContinent.name, false, true);

    const allContinents = getContinents().filter((c) => c.name !== randomContinent.name);
    const distractors = shuffleArray(allContinents.filter((c) => c.name !== randomContinent.name)).slice(0, 3);
    const options = shuffleArray([randomContinent, ...distractors]);

    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      options.map((continent) => ({ text: continent.hebrewName, callback_data: `${BOT_ACTIONS.CONTINENT_MAP} - ${continent.name} - ${randomContinent.name}` })),
    );
    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...(inlineKeyboardMarkup as any), caption: 'נחשו את היבשת' });
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTINENT_MAP }, userDetails);
  }
}
