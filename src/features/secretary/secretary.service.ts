import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { endOfDay, format, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { env } from 'node:process';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { getActiveChatIdsBetween, getMessagesForChatBetween, deleteMessagesBefore, saveMessage, type SecretaryMessage } from './mongo';
import { OWNER_NAME, SUMMARY_PROMPT } from './secretary.config';

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

  // Generate and return one summary per chat that had activity today.
  async buildDailySummaries(): Promise<{ chatId: number; summary: string }[]> {    const { start, end } = todayWindow();
    const chatIds = await getActiveChatIdsBetween(start, end);

    const summaries: { chatId: number; summary: string }[] = [];
    for (const chatId of chatIds) {
      const messages = await getMessagesForChatBetween(chatId, start, end);
      if (messages.length === 0) continue;
      const summary = await this.summarizeChat(messages);
      if (summary) summaries.push({ chatId, summary });
    }
    return summaries;
  }

  private async summarizeChat(messages: SecretaryMessage[]): Promise<string> {
    try {
      const other = messages.find((m) => !m.fromOwner);
      const otherName = other?.senderName || other?.senderUsername || `chat ${messages[0].chatId}`;
      const dateStr = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), 'dd/MM/yyyy');

      const transcript = messages.map((m) => `${m.fromOwner ? OWNER_NAME : otherName}: ${m.text}`).join('\n');
      const userPrompt = `Conversation with ${otherName} on ${dateStr}:\n\n${transcript}`;

      const result = await this.model.invoke([new SystemMessage(SUMMARY_PROMPT), new HumanMessage(userPrompt)]);
      const body = (result.content as string).trim();
      return `🗒️ Daily summary — ${otherName} (${dateStr})\n\n${body}`;
    } catch (err) {
      this.logger.error(`Failed to summarize chat ${messages[0]?.chatId}: ${err}`);
      return '';
    }
  }
}
