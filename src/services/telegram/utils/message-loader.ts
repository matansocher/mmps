import type TelegramBot from 'node-telegram-bot-api';
import { BOT_BROADCAST_ACTIONS } from '../constants';
import type { MessageLoaderOptions } from '../types';
import { reactToMessage } from '../utils';

const LOADER_MESSAGE = 'Loading...';
const SHOW_AFTER_MS = 3000;
const DELETE_AFTER_NO_RESPONSE_MS = 15000;

export class MessageLoader {
  private readonly bot: TelegramBot;
  private readonly botToken: string;
  private readonly chatId: number;
  private readonly messageId: number;
  private readonly loaderMessage: string;
  private readonly reactionEmoji: string;
  private readonly loadingAction: BOT_BROADCAST_ACTIONS;
  private readonly noMessage: boolean;

  private timeoutId?: NodeJS.Timeout;
  private loaderMessageId?: number;

  constructor(bot: TelegramBot, botToken: string, chatId: number, messageId: number, options: MessageLoaderOptions) {
    this.bot = bot;
    this.botToken = botToken;
    this.chatId = chatId;
    this.messageId = messageId;
    this.loaderMessage = options.loaderMessage || LOADER_MESSAGE;
    this.reactionEmoji = options.reactionEmoji;
    this.loadingAction = options.loadingAction || BOT_BROADCAST_ACTIONS.TYPING;
    this.noMessage = options.noMessage;
  }

  async handleMessageWithLoader(action: () => Promise<void>): Promise<void> {
    try {
      await this.#startLoader();
      await action();
    } catch (err) {
      await this.#stopLoader();
    } finally {
      await this.#stopLoader();
    }
  }

  async #startLoader(): Promise<void> {
    if (this.reactionEmoji) {
      await reactToMessage(this.botToken, this.chatId, this.messageId, this.reactionEmoji);
    }
    await this.bot.sendChatAction(this.chatId, this.loadingAction);

    this.timeoutId = setTimeout(async () => {
      if (!this.noMessage) {
        const messageRes = await this.bot.sendMessage(this.chatId, this.loaderMessage);
        this.loaderMessageId = messageRes.message_id;
      }

      this.timeoutId = setTimeout(async () => {
        await this.#stopLoader();
      }, DELETE_AFTER_NO_RESPONSE_MS);
    }, SHOW_AFTER_MS);
  }

  async #stopLoader(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
    if (this.loaderMessageId) {
      await this.bot.deleteMessage(this.chatId, this.loaderMessageId).catch(() => {});
      this.loaderMessageId = undefined;
    }
  }
}
