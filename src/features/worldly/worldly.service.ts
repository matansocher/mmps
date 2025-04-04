import * as fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { NotifierService } from '@core/notifier';
import { shuffleArray } from '@core/utils';
import { BOTS, getInlineKeyboardMarkup, UserDetails } from '@services/telegram';
import { getCapitalDistractors, getCountryMap, getFlagDistractors, getMapDistractors, getRandomCountry } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS } from './worldly.config';

@Injectable()
export class WorldlyService {
  constructor(
    private readonly notifier: NotifierService,
    @Inject(BOTS.WORLDLY.id) private readonly bot: TelegramBot,
  ) {}

  async mapHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const randomCountry = getRandomCountry((c) => !!c.geometry);
    const imagePath = getCountryMap(randomCountry.name);

    const otherOptions = getMapDistractors(randomCountry);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((country) => ({ text: country.name, callback_data: `${BOT_ACTIONS.MAP} - ${country.name} - ${randomCountry.name}` })));

    await this.bot.sendPhoto(chatId, fs.createReadStream(imagePath), { ...(inlineKeyboardMarkup as any), caption: 'Guess the country' });

    this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.MAP }, userDetails);
  }

  async flagHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const randomCountry = getRandomCountry((c) => !!c.emoji);

    const otherOptions = getFlagDistractors(randomCountry);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(options.map((country) => ({ text: country.name, callback_data: `${BOT_ACTIONS.FLAG} - ${country.name} - ${randomCountry.name}` })));

    await this.bot.sendMessage(chatId, randomCountry.emoji, { ...(inlineKeyboardMarkup as any) });

    this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.FLAG }, userDetails);
  }

  async capitalHandler(chatId: number, userDetails: UserDetails): Promise<void> {
    const randomCountry = getRandomCountry((c) => !!c.capital);

    const otherOptions = getCapitalDistractors(randomCountry);
    const options = shuffleArray([randomCountry, ...otherOptions]);
    const inlineKeyboardMarkup = getInlineKeyboardMarkup(
      options.map((country) => ({ text: country.capital, callback_data: `${BOT_ACTIONS.CAPITAL} - ${country.capital} - ${randomCountry.capital}` })),
    );

    const replyText = `Guess the capital city of ${randomCountry.emoji} ${randomCountry.name} ${randomCountry.emoji}`;
    await this.bot.sendMessage(chatId, replyText, { ...(inlineKeyboardMarkup as any) });

    this.notifier.notify(BOTS.WORLDLY, { action: ANALYTIC_EVENT_NAMES.CAPITAL }, userDetails);
  }
}
