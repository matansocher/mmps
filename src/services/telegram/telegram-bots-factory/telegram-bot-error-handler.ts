import TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { TELEGRAM_EVENTS } from '../constants';

export function createErrorEventListeners(bot: TelegramBot, botName: string): void {
  const botErrorHandler = (botName: string, handlerName: string, error): void => {
    const logger = new Logger(createErrorEventListeners.name);
    const { code, message } = error;
    logger.log(`${botName} - ${handlerName} - code: ${code}, message: ${message}`);
  };

  bot.on(TELEGRAM_EVENTS.POLLING_ERROR, async (error) => botErrorHandler(botName, TELEGRAM_EVENTS.POLLING_ERROR, error));
  bot.on(TELEGRAM_EVENTS.ERROR, async (error) => botErrorHandler(botName, TELEGRAM_EVENTS.ERROR, error));
}
