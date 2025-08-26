import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { handleCommand } from '.';
import { TELEGRAM_EVENTS, TelegramEventHandler } from '../constants';

export type RegisterHandlersOptions = {
  readonly bot: TelegramBot;
  readonly logger: Logger;
  readonly handlers: TelegramEventHandler[];
  readonly isBlocked?: boolean;
  readonly customErrorMessage?: string;
};

export function registerHandlers({ bot, logger, handlers, isBlocked = false, customErrorMessage = null }: RegisterHandlersOptions) {
  handlers.forEach(({ event, handler, regex }) => {
    const handlerName = (regex || event).replace('/', '');
    const unifiedCommandOptions = { bot, logger, handlerName, isBlocked, customErrorMessage };
    switch (event) {
      case TELEGRAM_EVENTS.COMMAND: {
        bot.onText(new RegExp(regex), async (message: Message) => {
          await handleCommand({ ...unifiedCommandOptions, message, handler });
        });
        break;
      }

      case TELEGRAM_EVENTS.MESSAGE:
      case TELEGRAM_EVENTS.TEXT:
      case TELEGRAM_EVENTS.CALLBACK_QUERY:
      case TELEGRAM_EVENTS.LOCATION:
      case TELEGRAM_EVENTS.PHOTO:
      case TELEGRAM_EVENTS.AUDIO:
      case TELEGRAM_EVENTS.VOICE:
      case TELEGRAM_EVENTS.EDITED_MESSAGE: {
        bot.on(event, async (message: Message | CallbackQuery) => {
          await handleCommand({ ...unifiedCommandOptions, message, handler, isCallbackQuery: event === TELEGRAM_EVENTS.CALLBACK_QUERY });
        });
        break;
      }
    }
  });
}
