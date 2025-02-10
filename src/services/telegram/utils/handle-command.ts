import { Message } from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage } from '@core/utils';
import { getMessageData } from '@services/telegram';

interface HandleCommandOptions {
  readonly message: Message;
  readonly logger: Logger;
  readonly handlerName: string;
  readonly handler: (chatId: number) => Promise<void>;
  readonly isBlocked?: boolean;
  readonly customErrorMessage?: string;
}

export async function handleCommand(handleCommandOptions: HandleCommandOptions) {
  const { message, logger, handlerName, handler, isBlocked = false, customErrorMessage = null } = handleCommandOptions;
  const { chatId, firstName, lastName } = getMessageData(message);
  const logBody = `chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

  try {
    if (isBlocked && chatId !== MY_USER_ID) {
      return;
    }
    logger.log(`${handlerName} - ${logBody} - start`);
    await handler(chatId);
    logger.log(`${handlerName} - ${logBody} - success`);
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    logger.error(`${handlerName} - ${logBody} - error - ${errorMessage}`);
    await this.bot.sendMessage(chatId, isBlocked ? errorMessage : customErrorMessage || 'Sorry, but something went wrong');
  }
}
