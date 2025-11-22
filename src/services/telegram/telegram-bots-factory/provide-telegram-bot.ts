import TelegramBot from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { TELEGRAM_EVENTS } from '../constants';
import type { TelegramBotConfig } from '../types';
import { getBotToken } from './get-bot-token';

const logger = new Logger('TelegramBotsFactory');
const botInstances = new Map<string, TelegramBot>();

const createErrorEventListeners = (bot: TelegramBot, botName: string): void => {
  const botErrorHandler = (botName: string, handlerName: string, error): void => {
    const { code, message } = error;
    logger.error(`${botName} - ${handlerName} - code: ${code}, message: ${message}`);
  };

  const { POLLING_ERROR, ERROR } = TELEGRAM_EVENTS;
  bot.on(POLLING_ERROR, async (error) => botErrorHandler(botName, POLLING_ERROR, error));
  bot.on(ERROR, async (error) => botErrorHandler(botName, ERROR, error));
};

export const provideTelegramBot = (botConfig: TelegramBotConfig): TelegramBot => {
  if (botInstances.has(botConfig.id)) {
    return botInstances.get(botConfig.id)!;
  }

  const botToken = env[botConfig.token];
  const token = getBotToken(botConfig.id, botToken, botConfig.forceLocal);

  if (!token) {
    throw new Error(`Bot ${botConfig.id} cannot be initialized - no token available. This should not happen as the module should not be loaded.`);
  }

  const bot = new TelegramBot(token, { polling: true });
  createErrorEventListeners(bot, botConfig.name);

  if (botConfig.commands) {
    bot.setMyCommands(Object.values(botConfig.commands).filter((command) => !command.hide));
  }

  botInstances.set(botConfig.id, bot);
  logger.log(`Bot ${botConfig.id} (${botConfig.name}) initialized successfully`);

  return bot;
};
