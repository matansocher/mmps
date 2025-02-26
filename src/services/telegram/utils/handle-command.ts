import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, stringify } from '@core/utils';
import { getCallbackQueryData, getMessageData } from '.';
import { RegisterHandlersOptions } from '.';

type HandleCommandOptions = Pick<RegisterHandlersOptions, 'bot' | 'logger' | 'isBlocked' | 'customErrorMessage'> & {
  readonly message: Message | CallbackQuery;
  readonly handlerName: string;
  readonly handler: (message: Message | CallbackQuery) => Promise<void> | void;
  readonly isCallbackQuery?: boolean;
};

export async function handleCommand(handleCommandOptions: HandleCommandOptions): Promise<void> {
  const { bot, message, logger, handlerName, handler, isCallbackQuery = false, isBlocked = false, customErrorMessage = null } = handleCommandOptions;
  const { chatId, userDetails, text } = isCallbackQuery ? getCallbackQueryData(message as CallbackQuery) : getMessageData(message as Message);
  const logBody = stringify({ chatId, firstName: userDetails.firstName, lastName: userDetails.lastName, text });

  try {
    if (isBlocked && chatId !== MY_USER_ID) {
      return;
    }
    logger.log(`${handlerName} - ${logBody} - start`);
    await handler(message);
    logger.log(`${handlerName} - ${logBody} - success`);
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    logger.error(`${handlerName} - ${logBody} - error - ${errorMessage}`);
    bot.sendMessage(chatId, isBlocked ? errorMessage : customErrorMessage || 'Sorry, but something went wrong');
  }
}
