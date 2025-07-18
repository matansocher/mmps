import TelegramBot from 'node-telegram-bot-api';
import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TELEGRAM_EVENTS } from '../constants';
import type { TelegramBotConfig } from '../types';
import { getBotToken } from './get-bot-token';

const createErrorEventListeners = (bot: TelegramBot, botName: string): void => {
  const botErrorHandler = (botName: string, handlerName: string, error): void => {
    const logger = new Logger(createErrorEventListeners.name);
    const { code, message } = error;
    logger.log(`${botName} - ${handlerName} - code: ${code}, message: ${message}`);
  };

  const { POLLING_ERROR, ERROR } = TELEGRAM_EVENTS;
  bot.on(POLLING_ERROR, async (error) => botErrorHandler(botName, POLLING_ERROR, error));
  bot.on(ERROR, async (error) => botErrorHandler(botName, ERROR, error));
};

export const TelegramBotsFactoryProvider = (botConfig: TelegramBotConfig): Provider => {
  return {
    inject: [ConfigService],
    provide: botConfig.id,
    useFactory: (configService: ConfigService): TelegramBot => {
      const botToken = configService.get(botConfig.token);
      const token = getBotToken(botConfig.id, botToken, botConfig.forceLocal);
      if (!token) {
        throw new Error(`No token found for bot ${botConfig.id}`);
      }
      const bot = new TelegramBot(token, { polling: true });
      createErrorEventListeners(bot, botConfig.name);
      if (botConfig.commands) {
        bot.setMyCommands(Object.values(botConfig.commands).filter((command) => !command.hide));
      }
      return bot;
    },
  };
};
