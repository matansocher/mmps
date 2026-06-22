import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { endOfDay, format, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { env } from 'node:process';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { CHANNELS } from '@services/telegram-client';
import { deleteEventsBefore, getEventsByDateRange, saveDailyStats, type CreateSelfieDailyStat, type SelfieEvent } from '@shared/selfie';

const MAX_CONVERSATIONS_PER_SECTION = 15;
const MAX_MESSAGES_PER_CONVERSATION = 60;
const MAX_TEXT_LENGTH = 400;

const NEWS_PROMPT = `You summarize a Telegram news/broadcast channel's posts for a single day. Produce 1-3 short bullets capturing the main updates. Only use what is in the posts, never invent. Reply in the language of the content. Plain text, light emojis ok, no heavy markdown.`;
const PERSONAL_PROMPT = `You summarize a one-day Telegram conversation (private chat or group) for the account owner. Produce 1-3 short bullets capturing what was discussed and anything worth remembering. Only use what is in the messages, never invent. Reply in the language of the content. Plain text, light emojis ok, no heavy markdown.`;

const todayWindow = () => {
  const nowLocal = toZonedTime(new Date(), DEFAULT_TIMEZONE);
  const start = fromZonedTime(startOfDay(nowLocal), DEFAULT_TIMEZONE);
  const end = fromZonedTime(endOfDay(nowLocal), DEFAULT_TIMEZONE);
  return { start, end };
};

const conversationName = (event: SelfieEvent): string => {
  const c = event.conversation;
  return c.title || c.userName || c.firstName || c.id;
};

export type DailySummaryResult = {
  readonly text: string;
  readonly stats: CreateSelfieDailyStat[];
};

export class SecretarySelfieService {
  private readonly logger = new Logger(SecretarySelfieService.name);
  private readonly model: ChatOpenAI;
  private readonly newsChannelIds: Set<string>;

  constructor() {
    this.model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.4, apiKey: env.OPENAI_API_KEY });
    this.newsChannelIds = new Set(
      Object.values(CHANNELS)
        .filter((channel) => channel.type === 'channel')
        .map((channel) => channel.id),
    );
  }

  // Build a daily digest of all captured Telegram activity, or null when there was none.
  async buildDailySummary(): Promise<DailySummaryResult | null> {
    const { start, end } = todayWindow();
    const events = await getEventsByDateRange(start, end);
    if (events.length === 0) return null;

    const dateStr = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), 'dd/MM/yyyy');
    const news = events.filter((event) => this.newsChannelIds.has(event.conversation.id));
    const personal = events.filter((event) => !this.newsChannelIds.has(event.conversation.id));

    const parts: string[] = [this.buildStatsHeader(events, personal, news, dateStr)];

    const newsSection = await this.buildSection(news, NEWS_PROMPT, false);
    if (newsSection) parts.push(`📰 News channels\n${newsSection}`);

    const personalSection = await this.buildSection(personal, PERSONAL_PROMPT, true);
    if (personalSection) parts.push(`💬 Private & groups\n${personalSection}`);

    return { text: parts.join('\n\n'), stats: this.buildStats(events) };
  }

  // Persist per-conversation message counts as long-lived metadata before events are deleted.
  async archiveDailyStats(stats: CreateSelfieDailyStat[]): Promise<void> {
    await saveDailyStats(stats);
  }

  async clearDailyEvents(cutoff: Date): Promise<number> {
    return deleteEventsBefore(cutoff);
  }

  private buildStats(events: SelfieEvent[]): CreateSelfieDailyStat[] {
    const date = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), 'yyyy-MM-dd');
    const byConversation = new Map<string, { name: string; count: number }>();
    for (const event of events) {
      const id = event.conversation.id;
      const existing = byConversation.get(id);
      if (existing) existing.count++;
      else byConversation.set(id, { name: conversationName(event), count: 1 });
    }
    return [...byConversation.entries()].map(([conversationId, { name, count }]) => ({
      date,
      conversationId,
      conversationName: name,
      type: this.newsChannelIds.has(conversationId) ? 'channel' : 'chat',
      count,
    }));
  }

  private buildStatsHeader(all: SelfieEvent[], personal: SelfieEvent[], news: SelfieEvent[], dateStr: string): string {
    const conversations = new Set(all.map((event) => event.conversation.id));
    const senders = new Set(all.filter((event) => event.sender).map((event) => event.sender!.id));

    const hourCounts = new Map<number, number>();
    for (const event of all) {
      const hour = event.date.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    let peakHour = 0;
    let peakCount = 0;
    for (const [hour, count] of hourCounts) {
      if (count > peakCount) {
        peakHour = hour;
        peakCount = count;
      }
    }
    const peakHourStr = peakCount > 0 ? `${String(peakHour).padStart(2, '0')}:00 (${peakCount})` : '—';

    return [
      `📊 Telegram daily summary — ${dateStr}`,
      `📨 Messages: ${all.length} (💬 ${personal.length} · 📰 ${news.length})`,
      `💬 Conversations: ${conversations.size}`,
      `👤 Senders: ${senders.size}`,
      `⏰ Peak hour: ${peakHourStr}`,
    ].join('\n');
  }

  private async buildSection(events: SelfieEvent[], systemPrompt: string, withSender: boolean): Promise<string> {
    if (events.length === 0) return '';

    const byConversation = new Map<string, SelfieEvent[]>();
    for (const event of events) {
      const list = byConversation.get(event.conversation.id) ?? [];
      list.push(event);
      byConversation.set(event.conversation.id, list);
    }

    const conversations = [...byConversation.values()].sort((a, b) => b.length - a.length).slice(0, MAX_CONVERSATIONS_PER_SECTION);

    const blocks: string[] = [];
    for (const conversationEvents of conversations) {
      const highlights = await this.summarizeConversation(conversationEvents, systemPrompt, withSender);
      if (highlights) blocks.push(`• ${conversationName(conversationEvents[0])}\n${highlights}`);
    }
    return blocks.join('\n\n');
  }

  private async summarizeConversation(events: SelfieEvent[], systemPrompt: string, withSender: boolean): Promise<string> {
    try {
      const ordered = [...events].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-MAX_MESSAGES_PER_CONVERSATION);
      const transcript = ordered
        .map((event) => {
          const text = (event.text ?? (event.isVoice ? '[voice message]' : '')).slice(0, MAX_TEXT_LENGTH);
          if (!withSender) return text;
          const who = event.sender?.firstName || event.sender?.userName || 'unknown';
          return `${who}: ${text}`;
        })
        .filter(Boolean)
        .join('\n');
      if (!transcript) return '';

      const title = conversationName(events[0]);
      const result = await this.model.invoke([new SystemMessage(systemPrompt), new HumanMessage(`"${title}" — today's messages:\n\n${transcript}`)]);
      return (result.content as string).trim();
    } catch (err) {
      this.logger.error(`Failed to summarize conversation ${events[0]?.conversation.id}: ${err}`);
      return '';
    }
  }
}
