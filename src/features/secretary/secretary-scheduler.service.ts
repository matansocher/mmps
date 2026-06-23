import type { Bot } from 'grammy';
import { randomUUID } from 'node:crypto';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { buildInlineKeyboard, sendShortenedMessage } from '@services/telegram';
import { createActions, setActionsMessageId, type CreateSecretaryActionData, type SecretarySummaryAction } from './mongo';
import { buildActionsKeyboard } from './secretary-action.service';
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
      for (const { summary, actions } of summaries) {
        await this.sendSummaryWithActions(summary, actions);
      }
      const deleted = await this.secretaryService.clearMessagesBefore(cutoff);
      this.logger.log(`Sent ${summaries.length} daily summaries, cleared ${deleted} messages.`);
    } catch (err) {
      this.logger.error(`Failed to send daily summaries: ${err}`);
    }
  }

  // Send a summary; when it has actionable items, attach one-tap buttons backed by persisted actions.
  private async sendSummaryWithActions(summary: string, actions: SecretarySummaryAction[]): Promise<void> {
    if (actions.length === 0) {
      await sendShortenedMessage(this.bot, MY_USER_ID, summary);
      return;
    }

    const records: CreateSecretaryActionData[] = actions.map((action) => ({ ...action, shortId: randomUUID().replace(/-/g, '').slice(0, 10), ownerChatId: MY_USER_ID }));
    await createActions(records);

    const keyboard = buildActionsKeyboard(records.map((record) => ({ shortId: record.shortId, label: record.label, status: 'pending' as const })));
    const sent = await this.bot.api.sendMessage(MY_USER_ID, summary, { reply_markup: keyboard });
    await setActionsMessageId(
      records.map((record) => record.shortId),
      sent.message_id,
    );
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
