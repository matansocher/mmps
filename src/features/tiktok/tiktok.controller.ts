import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { addChannel, getChannel, getFollowedChannels, removeChannel } from '@shared/tiktok';
import { BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR } from './tiktok.config';
import { processChannelVideos } from './utils';

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

    const inlineKeyboardButtons = channels.flatMap((channel) => [
      { text: `🔍 ${channel.username}`, callback_data: [BOT_ACTIONS.SEARCH_VIDEOS, channel.username].join(INLINE_KEYBOARD_SEPARATOR) },
      { text: `⛔️ Remove`, callback_data: [BOT_ACTIONS.REMOVE, channel.username].join(INLINE_KEYBOARD_SEPARATOR) },
    ]);

    await this.bot.sendMessage(chatId, 'Your subscribed channels:', getInlineKeyboardMarkup(inlineKeyboardButtons, 2));
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, text: username } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => username.includes(command.command))) return;

    const sanitizedUsername = username
      .trim()
      .replace(/[@#]/g, '')
      .replace(/[^\w\s.-]/g, '')
      .substring(0, 50);
    if (!sanitizedUsername) {
      await this.bot.sendMessage(chatId, 'Please provide a valid username.');
      return;
    }

    const existingSubscription = await getChannel(sanitizedUsername);
    if (existingSubscription) {
      await this.bot.sendMessage(chatId, `Already subscribed to @${sanitizedUsername}`);
      return;
    }

    await addChannel(sanitizedUsername);
    await this.bot.sendMessage(chatId, `✅ Successfully subscribed to @${sanitizedUsername}\n\nYou will now receive updates from this TikTok channel.`);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data } = getCallbackQueryData(callbackQuery);

    const [action, username] = data.split(INLINE_KEYBOARD_SEPARATOR);
    try {
      switch (action) {
        case BOT_ACTIONS.SEARCH_VIDEOS: {
          await this.searchChannelVideos(chatId, username);
          break;
        }
        case BOT_ACTIONS.REMOVE: {
          await this.removeSubscription(chatId, messageId, username);
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

  private async searchChannelVideos(chatId: number, username: string): Promise<void> {
    try {
      const channel = await getChannel(username);
      if (!channel) {
        await this.bot.sendMessage(chatId, `Channel @${username} not found in subscriptions.`);
        return;
      }

      await processChannelVideos({ bot: this.bot, chatId, channel });
    } catch (err) {
      this.logger.error(`Error in searchChannelVideos: ${err}`);
      await this.bot.sendMessage(chatId, `Sorry, there was an error searching for videos from @${username}. Please try again.`);
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
