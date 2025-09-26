import TelegramBot, { CallbackQuery, InlineKeyboardButton, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { formatUserDisplay, searchTikTokUsers, TikTokUserSearchResult } from '@services/tiktok';
import { addChannel, getChannel, getFollowedChannels, removeChannel } from '@shared/tiktok';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './tiktok.config';

@Injectable()
export class TiktokController implements OnModuleInit {
  private readonly logger = new Logger(TiktokController.name);

  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, LIST } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: LIST.command, handler: (message) => this.listHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.textHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const welcomeMessage =
      `👋 Welcome to TikTok Bot!\n\n` +
      `I can help you follow TikTok channels and get updates.\n\n` +
      `📝 **How to use:**\n` +
      `• Send me a TikTok username or name to search for users\n` +
      `• Select a user from the search results to subscribe\n` +
      `• Use /list to see and manage your subscriptions\n\n` +
      `🔍 **Example:** Try sending "cristiano" or "nike" to search for users`;

    await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  }

  async listHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const channels = await getFollowedChannels();
    if (!channels.length) {
      const replyText = `You are not subscribed to any channels. Send me a TikTok channel username to start getting updates.`;
      await this.bot.sendMessage(chatId, replyText);
      return;
    }

    const inlineKeyboardButtons = channels.map((channel) => {
      return {
        text: `⛔️ ${channel.username} ⛔️`,
        callback_data: [BOT_ACTIONS.REMOVE, channel.username].join(INLINE_KEYBOARD_SEPARATOR),
      };
    });

    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
    const replyText = 'Choose a channel to remove:';
    await this.bot.sendMessage(chatId, replyText, inlineKeyboardMarkup);
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, text: searchQuery } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => searchQuery.includes(command.command))) return;

    const sanitizedQuery = searchQuery
      .trim()
      .replace(/[@#]/g, '')
      .replace(/[^\w\s.-]/g, '')
      .substring(0, 50);
    if (!sanitizedQuery) {
      await this.bot.sendMessage(chatId, 'Please provide a valid search query.');
      return;
    }

    const searchResults = await searchTikTokUsers(sanitizedQuery);
    if (searchResults.length === 0) {
      await this.bot.sendMessage(chatId, `No TikTok users found for "${sanitizedQuery}". Please try a different search term or check the spelling.`);
      return;
    }

    await this.handleSearchResults(chatId, searchResults, sanitizedQuery);
  }

  private async handleSearchResults(chatId: number, searchResults: TikTokUserSearchResult[], query: string): Promise<void> {
    const inlineKeyboardButtons: InlineKeyboardButton[] = [];

    for (const user of searchResults) {
      const buttonText = formatUserDisplay(user);
      inlineKeyboardButtons.push({
        text: buttonText,
        callback_data: [BOT_ACTIONS.SEARCH_RESULT_SELECT, user.username].join(INLINE_KEYBOARD_SEPARATOR),
      });
    }

    const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons, 1);
    const replyText = `Found ${searchResults.length} user${searchResults.length > 1 ? 's' : ''} for "${query}".\nSelect a user to subscribe:`;

    await this.bot.sendMessage(chatId, replyText, inlineKeyboardMarkup);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data } = getCallbackQueryData(callbackQuery);

    const [action, username] = data.split(INLINE_KEYBOARD_SEPARATOR);
    try {
      switch (action) {
        case BOT_ACTIONS.REMOVE: {
          await this.removeSubscription(chatId, messageId, username);
          break;
        }
        case BOT_ACTIONS.SEARCH_RESULT_SELECT: {
          await this.handleUserSelection(callbackQuery, chatId, messageId, username);
          break;
        }
        default: {
          await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'לא הבנתי את הבקשה שלך 😕' });
          await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {});
          break;
        }
      }
    } catch (err) {
      this.logger.error(`${this.callbackQueryHandler.name} - error - ${err}`);
      throw err;
    }
  }

  private async handleUserSelection(callbackQuery: CallbackQuery, chatId: number, messageId: number, username: string): Promise<void> {
    try {
      const existingSubscription = await getChannel(username);
      if (existingSubscription) {
        await this.bot.answerCallbackQuery(callbackQuery.id, { text: `Already subscribed to @${username}` });
        await this.bot.editMessageText(`You are already subscribed to @${username}`, { message_id: messageId, chat_id: chatId });
        return;
      }

      await addChannel(username);

      await this.bot.answerCallbackQuery(callbackQuery.id, { text: `Subscribed to @${username}` });
      await this.bot.editMessageText(`✅ Successfully subscribed to @${username}\n\nYou will now receive updates from this TikTok channel.`, { message_id: messageId, chat_id: chatId });
    } catch (error) {
      this.logger.error(`Error in handleUserSelection: ${error}`);
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Error subscribing to user' });
      await this.bot.editMessageText('Sorry, there was an error subscribing to this user. Please try again.', { message_id: messageId, chat_id: chatId });
    }
  }

  async removeSubscription(chatId: number, messageId: number, username: string): Promise<void> {
    const followedChannels = await getFollowedChannels();
    const followedUsernames = followedChannels.map((channel) => channel.username);
    if (followedUsernames.includes(username)) {
      await removeChannel(username);
      await this.bot.sendMessage(chatId, `OK, I removed your subscription for: ${username}`);
    } else {
      await this.bot.sendMessage(chatId, `You are not subscribed to ${username}`);
    }
    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {});
  }
}
