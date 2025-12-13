import type { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Logger } from '@core/utils';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, provideTelegramBot, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { createUserPreferences, getActiveSubscriptions, getUserPreferences, Platform, saveUserDetails, updateUserPreferences } from '@shared/follower';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, MESSAGES } from './follower.config';
import { addSubscription, removeSubscription } from './utils';

export class FollowerController {
  private readonly logger = new Logger(FollowerController.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  init(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, LIST, ACTIONS } = BOT_CONFIG.commands;

    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: LIST.command, handler: (message) => this.listHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];

    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage: MESSAGES.ERROR, isBlocked: true });
  }

  private async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await saveUserDetails(userDetails);
    await createUserPreferences(userDetails.chatId);
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

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    try {
      const userPreferences = await getUserPreferences(chatId);
      const isNotificationsEnabled = userPreferences?.isNotificationsEnabled ?? true;

      const inlineKeyboardButtons = [
        isNotificationsEnabled
          ? {
              text: '🔕 Disable Notifications',
              callback_data: BOT_ACTIONS.DISABLE_NOTIFICATIONS,
            }
          : {
              text: '🔔 Enable Notifications',
              callback_data: BOT_ACTIONS.ENABLE_NOTIFICATIONS,
            },
        {
          text: '❓ Help',
          callback_data: BOT_ACTIONS.HELP,
        },
        {
          text: '📬 Contact',
          callback_data: BOT_ACTIONS.CONTACT,
        },
      ];

      const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
      await this.bot.sendMessage(chatId, '⚙️ Settings:', inlineKeyboardMarkup);
    } catch (err) {
      this.logger.error(`Error in actionsHandler: ${err}`);
      await this.bot.sendMessage(chatId, MESSAGES.ERROR);
    }
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data } = getCallbackQueryData(callbackQuery);

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
        case BOT_ACTIONS.DISABLE_NOTIFICATIONS: {
          await updateUserPreferences(chatId, { isNotificationsEnabled: false });
          await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Disabled!' });
          await this.bot.sendMessage(chatId, MESSAGES.NOTIFICATIONS_DISABLED);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          break;
        }
        case BOT_ACTIONS.ENABLE_NOTIFICATIONS: {
          await updateUserPreferences(chatId, { isNotificationsEnabled: true });
          await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Enabled!' });
          await this.bot.sendMessage(chatId, MESSAGES.NOTIFICATIONS_ENABLED);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          break;
        }
        case BOT_ACTIONS.HELP:
          await this.bot.answerCallbackQuery(callbackQuery.id);
          await this.bot.sendMessage(chatId, MESSAGES.HELP);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          break;
        case BOT_ACTIONS.CONTACT:
          await this.bot.answerCallbackQuery(callbackQuery.id);
          await this.bot.sendMessage(chatId, MESSAGES.CONTACT);
          await this.bot.deleteMessage(chatId, messageId).catch(() => {});
          break;
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
