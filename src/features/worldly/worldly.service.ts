import * as fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { WorldlyMongoSubscriptionService, WorldlyMongoUserService } from '@core/mongo/worldly-mongo';
import { NotifierService } from '@core/notifier';
import { shuffleArray } from '@core/utils';
import { AnthropicService } from '@services/anthropic';
import { capitalDistractorTool, CitiesResult, CountriesResult, flagDistractorTool } from '@services/anthropic/tools';
import { BLOCKED_ERROR, getInlineKeyboardMarkup } from '@services/telegram';
import { Country, State } from './types';
import { getCapitalDistractors, getCountryMap, getFlagDistractors, getMapDistractors, getMapStateDistractors, getRandomCountry, getRandomState } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './worldly.config';

@Injectable()
export class WorldlyService {
  constructor(
    private readonly subscriptionDB: WorldlyMongoSubscriptionService,
    private readonly userDB: WorldlyMongoUserService,
    private readonly notifier: NotifierService,
    private readonly anthropicService: AnthropicService,
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
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((country) => ({ text: country.hebrewName, callback_data: `${BOT_ACTIONS.MAP} - ${country.name} - ${randomCountry.name}` })));

    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...(inlineKeyboardMarkup as any), caption: 'נחשו את המדינה' });
  }

  async USMapHandler(chatId: number): Promise<void> {
    const gameFilter = (c: State) => !!c.geometry;
    const randomState = getRandomState(gameFilter);
    const imagePath = getCountryMap(randomState.name, true);

    const otherOptions = getMapStateDistractors(randomState);
    const options = shuffleArray([randomState, ...otherOptions]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((state) => ({ text: state.hebrewName, callback_data: `${BOT_ACTIONS.US_MAP} - ${state.name} - ${randomState.name}` })));

    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...(inlineKeyboardMarkup as any), caption: 'נחשו את המדינה בארצות הברית' });
  }

  async flagHandler(chatId: number): Promise<void> {
    const gameFilter = (c: Country) => !!c.emoji;
    const randomCountry = getRandomCountry(gameFilter);

    const otherCountryOptions = await this.anthropicService.executeTool<CountriesResult>(
      flagDistractorTool,
      `Get a list of 6 countries that their flag is the most similar to the flag of the country: ${randomCountry.name}`,
    );

    const options = getFlagDistractors(randomCountry, gameFilter, otherCountryOptions);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((country) => ({ text: country.hebrewName, callback_data: `${BOT_ACTIONS.FLAG} - ${country.name} - ${randomCountry.name}` })));

    await this.bot.sendMessage(chatId, randomCountry.emoji, { ...(inlineKeyboardMarkup as any) });
  }

  async capitalHandler(chatId: number): Promise<void> {
    const gameFilter = (c: Country) => !!c.capital;
    const randomCountry = getRandomCountry(gameFilter);

    const otherCitiesOptions = await this.anthropicService.executeTool<CitiesResult>(
      capitalDistractorTool,
      `The capital city of ${randomCountry.name} is ${randomCountry.capital}. Get a list of 6 cities that can distract the user from the correct answer. Can be capitals from other close by similar countries and also other cities from the same countries. Exclude the input country and city.`,
    );

    const options = getCapitalDistractors(randomCountry, gameFilter, otherCitiesOptions);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((capital) => ({ text: capital, callback_data: `${BOT_ACTIONS.CAPITAL} - ${capital} - ${randomCountry.hebrewCapital}` })));

    const replyText = ['נחשו את עיר הבירה של:', `${randomCountry.emoji} ${randomCountry.hebrewName} ${randomCountry.emoji}`].join(' ');
    await this.bot.sendMessage(chatId, replyText, { ...(inlineKeyboardMarkup as any) });
  }
}
