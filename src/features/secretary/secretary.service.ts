import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { endOfDay, format, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { env } from 'node:process';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { getActiveChatIdsBetween, getMessagesForChatBetween, deleteMessagesBefore, saveMessage, type SecretaryMessage, type SecretarySummaryAction } from './mongo';
import { OWNER_NAME, SUMMARY_PROMPT } from './secretary.config';

const summarySchema = z.object({
  summary: z.string().describe('The prose end-of-day briefing for this chat'),
  actions: z
    .array(
      z.object({
        type: z.enum(['calendar', 'reminder']).describe('The kind of action'),
        label: z.string().describe('Short button label in the conversation language, starting with an emoji (📅 calendar, ⏰ reminder)'),
        instruction: z.string().describe('Precise imperative for an assistant to execute, with absolute date and time'),
      }),
    )
    .describe('Concrete one-tap calendar/reminder actions grounded in the conversation; empty if none'),
});

export type DailySummary = {
  readonly chatId: number;
  readonly summary: string;
  readonly actions: SecretarySummaryAction[];
};

// Build the day window [00:00, next 00:00) in the project timezone.
const todayWindow = () => {
  const nowLocal = toZonedTime(new Date(), DEFAULT_TIMEZONE);
  const start = fromZonedTime(startOfDay(nowLocal), DEFAULT_TIMEZONE);
  const end = fromZonedTime(endOfDay(nowLocal), DEFAULT_TIMEZONE);
  return { start, end };
};

export class SecretaryService {
  private readonly logger = new Logger(SecretaryService.name);
  private readonly model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.4, apiKey: env.OPENAI_API_KEY });
  }

  // Persist a single message (either side) for later daily summarization.
  async storeMessage(data: { chatId: number; fromOwner: boolean; text: string; transcribed?: boolean; senderName?: string; senderUsername?: string }): Promise<void> {
    const { chatId, fromOwner, text, transcribed = false, senderName, senderUsername } = data;
    await saveMessage({ chatId, fromOwner, text, transcribed, senderName, senderUsername });
  }

  // Delete persisted messages older than the cutoff, after the daily summaries have been sent.
  async clearMessagesBefore(cutoff: Date): Promise<number> {
    return deleteMessagesBefore(cutoff);
  }

  // Generate and return one summary (with extracted actions) per chat that had activity today.
  async buildDailySummaries(): Promise<DailySummary[]> {
    const { start, end } = todayWindow();
    const chatIds = await getActiveChatIdsBetween(start, end);

    const summaries: DailySummary[] = [];
    for (const chatId of chatIds) {
      const messages = await getMessagesForChatBetween(chatId, start, end);
      if (messages.length === 0) continue;
      const result = await this.summarizeChat(messages);
      if (result) summaries.push({ chatId, ...result });
    }
    return summaries;
  }

  private async summarizeChat(messages: SecretaryMessage[]): Promise<{ summary: string; actions: SecretarySummaryAction[] } | null> {
    try {
      const other = messages.find((m) => !m.fromOwner);
      const otherName = other?.senderName || other?.senderUsername || `chat ${messages[0].chatId}`;
      const dateStr = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), 'dd/MM/yyyy');

      const transcript = messages.map((m) => `${m.fromOwner ? OWNER_NAME : otherName}: ${m.text}`).join('\n');
      const userPrompt = `Conversation with ${otherName} on ${dateStr} (use this date to resolve relative dates):\n\n${transcript}`;

      const structured = this.model.withStructuredOutput(summarySchema, { name: 'daily_summary' });
      const result = await structured.invoke([new SystemMessage(SUMMARY_PROMPT), new HumanMessage(userPrompt)]);

      const body = result.summary.trim();
      const summary = `🗒️ Daily summary — ${otherName} (${dateStr})\n\n${body}`;
      return { summary, actions: (result.actions ?? []) as SecretarySummaryAction[] };
    } catch (err) {
      this.logger.error(`Failed to summarize chat ${messages[0]?.chatId}: ${err}`);
      return null;
    }
  }
}
