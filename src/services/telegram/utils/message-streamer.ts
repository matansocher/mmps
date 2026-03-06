import type { Bot } from 'grammy';
import { GrammyError } from 'grammy';
import { Logger } from '@core/utils';

const MIN_UPDATE_INTERVAL_MS = 500;
const DEFAULT_UPDATE_INTERVAL_MS = 1500;

export type MessageStreamerOptions = {
  readonly chatId: number;
  readonly draftId?: number;
  readonly updateIntervalMs?: number;
  readonly parseMode?: 'Markdown' | 'HTML';
};

export class MessageStreamer {
  private readonly logger = new Logger(MessageStreamer.name);
  private readonly bot: Bot;
  private readonly chatId: number;
  private readonly draftId: number;
  private updateIntervalMs: number;
  private readonly parseMode?: 'Markdown' | 'HTML';

  private lastSentText = '';
  private lastUpdateTime = 0;
  private pendingText = '';
  private flushTimer?: ReturnType<typeof setTimeout>;

  constructor(bot: Bot, options: MessageStreamerOptions) {
    this.bot = bot;
    this.chatId = options.chatId;
    this.draftId = options.draftId ?? Math.floor(Math.random() * 1_000_000) + 1;
    this.updateIntervalMs = Math.max(MIN_UPDATE_INTERVAL_MS, options.updateIntervalMs ?? DEFAULT_UPDATE_INTERVAL_MS);
    this.parseMode = options.parseMode;
  }

  async updateDraft(text: string): Promise<void> {
    if (text === this.lastSentText) return;

    this.pendingText = text;

    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    if (timeSinceLastUpdate >= this.updateIntervalMs) {
      await this.flush();
    } else if (!this.flushTimer) {
      const delay = this.updateIntervalMs - timeSinceLastUpdate;
      this.flushTimer = setTimeout(() => this.flush(), delay);
    }
  }

  async finalize(text: string): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Send the final draft update — Telegram converts it into a real message
    await this.sendDraft(text);
  }

  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    if (this.pendingText === this.lastSentText) return;

    await this.sendDraft(this.pendingText);
  }

  private async sendDraft(text: string): Promise<void> {
    try {
      await this.bot.api.sendMessageDraft(this.chatId, this.draftId, text, this.parseMode ? { parse_mode: this.parseMode } : undefined);
      this.lastSentText = text;
      this.lastUpdateTime = Date.now();
    } catch (err) {
      if (err instanceof GrammyError && err.error_code === 429) {
        const retryAfterMs = (err.parameters?.retry_after ?? 10) * 1000;
        this.logger.warn(`Rate limited, backing off ${retryAfterMs}ms`);
        this.updateIntervalMs = Math.max(this.updateIntervalMs, retryAfterMs);
        this.pendingText = text;
        if (!this.flushTimer) {
          this.flushTimer = setTimeout(() => this.flush(), retryAfterMs);
        }
        return;
      }
      this.logger.error(`Failed to send draft: ${err}`);
    }
  }
}
