import type { Bot } from 'grammy';
import { randomUUID } from 'node:crypto';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { buildActionsKeyboard, createActions, type CreateSecretaryActionData, type SecretaryMessageService, type SecretarySummaryAction, setActionsMessageId } from '../secretary';

const logger = new Logger('chatbot:scheduler:secretary-daily-digest');

// Send a summary; when it has actionable items, attach one-tap buttons backed by persisted actions.
async function sendSummaryWithActions(bot: Bot, summary: string, actions: SecretarySummaryAction[]): Promise<void> {
  if (actions.length === 0) {
    await sendShortenedMessage(bot, MY_USER_ID, summary);
    return;
  }

  const records: CreateSecretaryActionData[] = actions.map((action) => ({ ...action, shortId: randomUUID().replace(/-/g, '').slice(0, 10), ownerChatId: MY_USER_ID }));
  await createActions(records);

  const keyboard = buildActionsKeyboard(records.map((record) => ({ shortId: record.shortId, label: record.label, status: 'pending' as const })));
  const sent = await bot.api.sendMessage(MY_USER_ID, summary, { reply_markup: keyboard });
  await setActionsMessageId(
    records.map((record) => record.shortId),
    sent.message_id,
  );
}

export async function secretaryDailyDigest(bot: Bot, messageService: SecretaryMessageService): Promise<void> {
  const cutoff = new Date();
  try {
    const summaries = await messageService.buildDailySummaries();
    for (const { summary, actions } of summaries) {
      await sendSummaryWithActions(bot, summary, actions);
    }
    const deleted = await messageService.clearMessagesBefore(cutoff);
    logger.log(`Sent ${summaries.length} daily summaries, cleared ${deleted} messages.`);
  } catch (err) {
    logger.error(`Failed to send daily summaries: ${getErrorMessage(err)}`);
  }
}
