import type TelegramBot from 'node-telegram-bot-api';
import { BOT_BROADCAST_ACTIONS } from '../constants';
import type { MessageLoaderOptions } from '../interface';

const LOADER_EMOJI = '🐢';
const MAX_EMOJIS = 5;
const DEFAULT_CYCLE_DURATION = 5000;

export class MessageLoader {
  private readonly bot: TelegramBot;
  private readonly chatId: number;
  private readonly loaderEmoji: string;
  private readonly maxEmojis: number;
  private readonly cycleDuration: number;
  private readonly loadingAction: BOT_BROADCAST_ACTIONS;

  private cycleIterationIndex: number = 0;
  private timeoutId?: NodeJS.Timeout;
  private loaderMessageId?: number;

  constructor(bot: TelegramBot, chatId: number, options: MessageLoaderOptions) {
    this.bot = bot;
    this.chatId = chatId;
    this.maxEmojis = options.maxEmojis || MAX_EMOJIS;
    this.loaderEmoji = options.loaderEmoji || LOADER_EMOJI;
    this.loadingAction = options.loadingAction || BOT_BROADCAST_ACTIONS.TYPING;
    this.cycleDuration = options.cycleDuration || DEFAULT_CYCLE_DURATION;
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
    await this.bot.sendChatAction(this.chatId, this.loadingAction);
    this.cycleIterationIndex = 0;
    await this.#cycle();
  }

  async #cycle(): Promise<void> {
    if (this.cycleIterationIndex >= this.maxEmojis) {
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
    }, this.cycleDuration);
  }

  async #updateLoaderMessage(): Promise<void> {
    const loaderEmojis = this.loaderEmoji.repeat(this.cycleIterationIndex + 1);

    if (this.cycleIterationIndex === 0) {
      const messageRes = await this.bot.sendMessage(this.chatId, loaderEmojis);
      this.loaderMessageId = messageRes.message_id;
    } else if (this.loaderMessageId) {
      await this.bot.editMessageText(loaderEmojis, {
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
