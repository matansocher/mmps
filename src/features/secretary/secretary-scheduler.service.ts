import type { Bot } from 'grammy';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { SecretaryService } from './secretary.service';

export class SecretarySchedulerService {
  private readonly logger = new Logger(SecretarySchedulerService.name);

  constructor(
    private readonly secretaryService: SecretaryService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    cron.schedule('30 23 * * *', () => this.sendDailySummaries(), { timezone: DEFAULT_TIMEZONE });
  }

  async sendDailySummaries(): Promise<void> {
    try {
      const summaries = await this.secretaryService.buildDailySummaries();
      for (const { summary } of summaries) {
        await sendShortenedMessage(this.bot, MY_USER_ID, summary);
      }
      this.logger.log(`Sent ${summaries.length} daily summaries.`);
    } catch (err) {
      this.logger.error(`Failed to send daily summaries: ${err}`);
    }
  }
}
