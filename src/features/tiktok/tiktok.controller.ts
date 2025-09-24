import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { addChannel, getChannel, getFollowedChannels, removeChannel } from '@shared/tiktok/mongo/channel.repository';
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
    await this.bot.sendMessage(chatId, 'Hi');
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
    const { chatId, text: username } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => username.includes(command.command))) return;

    const existingSubscription = await getChannel(username);
    if (existingSubscription) {
      const replyText = `you are already subscribed to ${username}`;
      await this.bot.sendMessage(chatId, replyText);
      return;
    }

    await addChannel(username);
    await this.bot.sendMessage(chatId, '👍');
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
