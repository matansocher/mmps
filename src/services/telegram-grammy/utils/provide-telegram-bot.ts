import { Bot } from 'grammy';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import type { TelegramBotConfig } from '../types';
import { getBotToken } from './get-bot-token';

const logger = new Logger('TelegramBotsFactory');
const botInstances = new Map<string, Bot>();

export const provideTelegramBot = (botConfig: TelegramBotConfig): Bot => {
  if (botInstances.has(botConfig.id)) {
    return botInstances.get(botConfig.id);
  }

  const botToken = env[botConfig.token];
  const token = getBotToken(botConfig.id, botToken, botConfig.forceLocal);

  if (!token) {
    throw new Error(`Bot ${botConfig.id} cannot be initialized - no token available. This should not happen as the module should not be loaded.`);
  }

  const bot = new Bot(token);

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    console.error(err.error);
  });

  if (botConfig.commands) {
    bot.api.setMyCommands(Object.values(botConfig.commands).filter((command) => !command.hide));
  }

  botInstances.set(botConfig.id, bot);

  bot.start();

  logger.log(`Bot ${botConfig.id} (${botConfig.name}) initialized successfully`);

  return bot;
};
