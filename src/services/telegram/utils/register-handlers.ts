import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { handleCommand, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';

interface RegisterCommandsOptions {
  readonly bot: TelegramBot;
  readonly logger: Logger;
  readonly handlers: TelegramEventHandler[];
  readonly isBlocked?: boolean;
  readonly customErrorMessage?: string;
}

export function registerHandlers({ bot, logger, handlers, isBlocked = false, customErrorMessage = null }: RegisterCommandsOptions) {
  handlers.forEach(({ event, handler, regex }) => {
    const unifiedCommandOptions = { bot, logger, isBlocked, customErrorMessage };
    switch (event) {
      case TELEGRAM_EVENTS.COMMAND: {
        bot.onText(new RegExp(regex), async (message: Message) => {
          await handleCommand({
            ...unifiedCommandOptions,
            message,
            handlerName: handler.name,
            handler: async (message) => handler(message),
          });
        });
        break;
      }

      case TELEGRAM_EVENTS.MESSAGE:
      case TELEGRAM_EVENTS.TEXT:
      case TELEGRAM_EVENTS.CALLBACK_QUERY: {
        bot.on(event, async (message: Message | CallbackQuery) => {
          await handleCommand({
            ...unifiedCommandOptions,
            message,
            handlerName: handler.name,
            handler: async (message) => handler(message),
            isCallbackQuery: event === TELEGRAM_EVENTS.CALLBACK_QUERY,
          });
        });
        break;
      }
    }
  });
}
