import * as fs from 'fs';
import { type Bot, InputFile } from 'grammy';
import { generateRandomString, shuffleArray } from '@core/utils';
import { notify } from '@services/notifier';
import { BLOCKED_ERROR, buildInlineKeyboard } from '@services/telegram';
import { Country, getAllCountries, getAllStates, getRandomCountry, getRandomState, getUserDetails, saveGameLog, State, updateSubscription } from '@shared/worldly';
import { getAreaMap, getCapitalDistractors, getFlagDistractors, getMapDistractors, getMapStateDistractors } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './worldly.config';

export class WorldlyService {
  constructor(private readonly bot: Bot) {}

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
        const userDetails = await getUserDetails(chatId);
        notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
        await updateSubscription(chatId, { isActive: false });
      }
    }
  }

  async mapHandler(chatId: number): Promise<void> {
    const gameFilter = (c: Country) => !!c.geometry;
    const allCountries = await getAllCountries();
    const randomCountry = await getRandomCountry(gameFilter);
    const imagePath = getAreaMap(allCountries, randomCountry.name);

    const otherOptions = getMapDistractors(allCountries, randomCountry);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const gameId = generateRandomString(5);
    const keyboard = buildInlineKeyboard(
      options.map((country) => ({ text: country.hebrewName, data: [BOT_ACTIONS.MAP, country.name, randomCountry.name, gameId].join(INLINE_KEYBOARD_SEPARATOR), style: 'primary' as const })),
    );

    await this.bot.api.sendPhoto(chatId, new InputFile(fs.createReadStream(imagePath)), { reply_markup: keyboard, caption: 'נחשו את המדינה' });

    await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.MAP, correct: randomCountry.name });
  }

  async USMapHandler(chatId: number): Promise<void> {
    const gameFilter = (c: State) => !!c.geometry;
    const allStates = await getAllStates();
    const randomState = await getRandomState(gameFilter);
    const imagePath = getAreaMap(allStates, randomState.name, true);

    const otherOptions = getMapStateDistractors(allStates, randomState);
    const options = shuffleArray([randomState, ...otherOptions]);
    const gameId = generateRandomString(5);
    const keyboard = buildInlineKeyboard(
      options.map((state) => ({ text: state.hebrewName, data: [BOT_ACTIONS.US_MAP, state.name, randomState.name, gameId].join(INLINE_KEYBOARD_SEPARATOR), style: 'primary' as const })),
    );

    await this.bot.api.sendPhoto(chatId, new InputFile(fs.createReadStream(imagePath)), { reply_markup: keyboard, caption: 'נחשו את המדינה בארצות הברית' });

    await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.US_MAP, correct: randomState.name });
  }

  async flagHandler(chatId: number): Promise<void> {
    const gameFilter = (c: Country) => !!c.emoji;
    const allCountries = await getAllCountries();
    const randomCountry = await getRandomCountry(gameFilter);

    const otherOptions = getFlagDistractors(allCountries, randomCountry, gameFilter);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const gameId = generateRandomString(5);
    const keyboard = buildInlineKeyboard(
      options.map((country) => ({ text: country.hebrewName, data: [BOT_ACTIONS.FLAG, country.name, randomCountry.name, gameId].join(INLINE_KEYBOARD_SEPARATOR), style: 'primary' as const })),
    );

    await this.bot.api.sendMessage(chatId, randomCountry.emoji, { reply_markup: keyboard });

    await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.FLAG, correct: randomCountry.name });
  }

  async capitalHandler(chatId: number): Promise<void> {
    const gameFilter = (c: Country) => !!c.capital;
    const allCountries = await getAllCountries();
    const randomCountry = await getRandomCountry(gameFilter);

    const otherOptions = getCapitalDistractors(allCountries, randomCountry, gameFilter);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const gameId = generateRandomString(5);
    const keyboard = buildInlineKeyboard(
      options.map((country) => ({
        text: country.hebrewCapital,
        data: [BOT_ACTIONS.CAPITAL, country.hebrewCapital, randomCountry.hebrewCapital, gameId].join(INLINE_KEYBOARD_SEPARATOR),
        style: 'primary' as const,
      })),
    );

    const replyText = ['נחשו את עיר הבירה של:', `${randomCountry.emoji} ${randomCountry.hebrewName} ${randomCountry.emoji}`].join(' ');
    await this.bot.api.sendMessage(chatId, replyText, { reply_markup: keyboard });

    await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.CAPITAL, correct: randomCountry.name });
  }
}
