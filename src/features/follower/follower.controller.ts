import type { CallbackQuery, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, provideTelegramBot, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { getActiveSubscriptions, Platform } from '@shared/follower';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, MESSAGES } from './follower.config';
import { addSubscription, removeSubscription } from './utils';

export class FollowerController {
  private readonly logger = new Logger(FollowerController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  init(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, LIST } = BOT_CONFIG.commands;

    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: LIST.command, handler: (message) => this.listHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];

    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage: MESSAGES.ERROR, isBlocked: true });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    await this.bot.sendMessage(chatId, MESSAGES.WELCOME);
  }

  private async listHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    try {
      const subscriptions = await getActiveSubscriptions(chatId);

      if (subscriptions.length === 0) {
        await this.bot.sendMessage(chatId, MESSAGES.NO_SUBSCRIPTIONS);
        return;
      }

      const header = `📋 Your subscriptions (${subscriptions.length}):\n\n`;
      await this.bot.sendMessage(chatId, header);

      const inlineKeyboardButtons = subscriptions.map((subscription) => ({
        text: subscription.channelName,
        callback_data: [BOT_ACTIONS.REMOVE, subscription.platform, subscription.channelId].join(INLINE_KEYBOARD_SEPARATOR),
      }));

      const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
      await this.bot.sendMessage(chatId, 'Click on a channel to remove it from your subscriptions', inlineKeyboardMarkup);
    } catch (err) {
      this.logger.error(`Error in listHandler: ${err}`);
      await this.bot.sendMessage(chatId, MESSAGES.ERROR);
    }
  }

  private async messageHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

    if (text.startsWith('/')) {
      return;
    }

    const urlPattern = /(https?:\/\/[^\s]+)/;
    const match = text.match(urlPattern);

    if (match) {
      const url = match[1];
      const result = await addSubscription(chatId, url);
      await this.bot.sendMessage(chatId, result);
    } else {
      await this.bot.sendMessage(chatId, MESSAGES.INVALID_URL);
    }
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId } = getCallbackQueryData(callbackQuery);
    const { messageId, data } = getCallbackQueryData(callbackQuery);

    const [action, platform, channelId] = data.split(INLINE_KEYBOARD_SEPARATOR);

    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {});

    try {
      switch (action) {
        case BOT_ACTIONS.REMOVE: {
          const result = await removeSubscription(chatId, channelId, platform as Platform);
          await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Removed!' });
          await this.bot.sendMessage(chatId, result);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          break;
        }
        default:
          this.logger.error(`Invalid action: ${action}`);
          await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Invalid action' });
      }
    } catch (err) {
      this.logger.error(`Error in callbackQueryHandler: ${err}`);
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Error occurred' });
    }
  }
}
