import TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';

export function createErrorEventListeners(bot: TelegramBot, botName: string): void {
  const botErrorHandler = (botName: string, handlerName: string, error): void => {
    const logger = new Logger(createErrorEventListeners.name);
    const { code, message } = error;
    logger.log(`${botName} - ${handlerName}`, `code: ${code}, message: ${message}`);
  };

  bot.on('polling_error', async (error) => botErrorHandler(botName, 'polling_error', error));
  bot.on('error', async (error) => botErrorHandler(botName, 'error', error));
}
