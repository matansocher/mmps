import type TelegramBot from 'node-telegram-bot-api';
import { reactToMessage } from '@services/telegram';
import { BOT_BROADCAST_ACTIONS } from '../constants';
import type { MessageLoaderOptions } from '../interface';

// const REACTION_EMOJI = '🤔';
const LOADER_MESSAGE = 'Loading...';
const MAX_EMOJIS = 5;
const CYCLE_DURATION = 5000;

export class MessageLoader {
  private readonly bot: TelegramBot;
  private readonly botToken: string;
  private readonly chatId: number;
  private readonly messageId: number;
  private readonly loaderMessage: string;
  private readonly reactionEmoji: string;
  private readonly loadingAction: BOT_BROADCAST_ACTIONS;

  private cycleIterationIndex: number = 0;
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
  }

  async handleMessageWithLoader(action: () => Promise<void>) {
    try {
      await this.#startLoader();
      await action();
    } catch (err) {
      await this.#stopLoader();
    } finally {
      await this.#stopLoader();
    }
  }

  async #startLoader() {
    if (this.reactionEmoji) {
      await reactToMessage(this.botToken, this.chatId, this.messageId, this.reactionEmoji);
    }
    await this.bot.sendChatAction(this.chatId, this.loadingAction);
    this.cycleIterationIndex = 0;
    await this.#cycle();
  }

  async #cycle(): Promise<void> {
    if (this.cycleIterationIndex >= MAX_EMOJIS) {
      await this.#stopLoader();
      return;
    }

    this.timeoutId = setTimeout(async () => {
      try {
        await this.#updateLoaderMessage();
        await this.#cycle();
      } catch {
        await this.#stopLoader();
      }
    }, CYCLE_DURATION);
  }

  async #updateLoaderMessage(): Promise<void> {
    const loaderMessages = this.loaderMessage.repeat(this.cycleIterationIndex + 1);

    if (this.cycleIterationIndex === 0) {
      const messageRes = await this.bot.sendMessage(this.chatId, loaderMessages);
      this.loaderMessageId = messageRes.message_id;
    } else if (this.loaderMessageId) {
      await this.bot.editMessageText(loaderMessages, {
        chat_id: this.chatId,
        message_id: this.loaderMessageId,
      });
    }

    await this.bot.sendChatAction(this.chatId, this.loadingAction);
    this.cycleIterationIndex++;
  }

  async #stopLoader(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
    if (this.loaderMessageId) {
      await this.bot.deleteMessage(this.chatId, this.loaderMessageId).catch();
      this.loaderMessageId = undefined;
    }
    this.cycleIterationIndex = 0;
  }
}
