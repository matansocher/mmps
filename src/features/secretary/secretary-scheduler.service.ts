import type { Bot } from 'grammy';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { buildInlineKeyboard, sendShortenedMessage } from '@services/telegram';
import { CHECK_IN_MESSAGE, CHECK_IN_SEND_CALLBACK } from './secretary.config';
import { SecretaryService } from './secretary.service';

export class SecretarySchedulerService {
  private readonly logger = new Logger(SecretarySchedulerService.name);

  constructor(
    private readonly secretaryService: SecretaryService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    cron.schedule('30 23 * * *', () => this.runDailyDigest(), { timezone: DEFAULT_TIMEZONE });
    cron.schedule('13 12 * * 1,2,3', () => this.sendCheckInPrompt(), { timezone: DEFAULT_TIMEZONE });
  }

  async runDailyDigest(): Promise<void> {
    await this.sendDailySummaries();
  }

  async sendDailySummaries(): Promise<void> {
    const cutoff = new Date();
    try {
      const summaries = await this.secretaryService.buildDailySummaries();
      for (const { summary } of summaries) {
        await sendShortenedMessage(this.bot, MY_USER_ID, summary);
      }
      const deleted = await this.secretaryService.clearMessagesBefore(cutoff);
      this.logger.log(`Sent ${summaries.length} daily summaries, cleared ${deleted} messages.`);
    } catch (err) {
      this.logger.error(`Failed to send daily summaries: ${err}`);
    }
  }

  async sendCheckInPrompt(): Promise<void> {
    try {
      const keyboard = buildInlineKeyboard([{ text: 'Send ✅', data: CHECK_IN_SEND_CALLBACK, style: 'success' }]);
      await this.bot.api.sendMessage(MY_USER_ID, `Send this to her?\n\n"${CHECK_IN_MESSAGE}"`, { reply_markup: keyboard });
    } catch (err) {
      this.logger.error(`Failed to send check-in prompt: ${err}`);
    }
  }
}
