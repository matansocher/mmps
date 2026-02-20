import type { Bot } from 'grammy';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { type SelfieEvent, getEventsByDateRange } from '@shared/selfie';

const logger = new Logger('SelfieSummaryScheduler');

export async function selfieSummary(bot: Bot): Promise<void> {
  try {
    const nowLocal = toZonedTime(new Date(), DEFAULT_TIMEZONE);
    const yesterdayLocal = subDays(nowLocal, 1);
    const start = fromZonedTime(startOfDay(yesterdayLocal), DEFAULT_TIMEZONE);
    const end = fromZonedTime(endOfDay(yesterdayLocal), DEFAULT_TIMEZONE);

    const events = await getEventsByDateRange(start, end);

    if (events.length === 0) {
      await bot.api.sendMessage(MY_USER_ID, '📊 No Telegram activity yesterday.');
      return;
    }

    const dateStr = format(yesterdayLocal, 'dd/MM/yyyy');
    const message = formatSummaryMessage(events, dateStr);

    await bot.api.sendMessage(MY_USER_ID, message, { parse_mode: 'Markdown' });
    logger.log(`Sent selfie summary for ${dateStr} (${events.length} events)`);
  } catch (err) {
    logger.error(`Failed to send selfie summary: ${err.message}`);
  }
}

function formatSummaryMessage(events: SelfieEvent[], dateStr: string): string {
  const totalCount = events.length;

  const senderCounts = new Map<string, { count: number; name: string }>();
  const conversationCounts = new Map<string, { count: number; name: string }>();
  const hourCounts = new Map<number, number>();
  const uniqueSenders = new Set<string>();
  const uniqueConversations = new Set<string>();

  for (const event of events) {
    if (event.sender) {
      const senderId = event.sender.id;
      uniqueSenders.add(senderId);
      const existing = senderCounts.get(senderId);
      const senderName = event.sender.firstName || event.sender.userName || senderId;
      if (existing) {
        existing.count++;
      } else {
        senderCounts.set(senderId, { count: 1, name: senderName });
      }
    }

    const convId = event.conversation.id;
    uniqueConversations.add(convId);
    const existingConv = conversationCounts.get(convId);
    const convName = event.conversation.title || event.conversation.userName || event.conversation.firstName || convId;
    if (existingConv) {
      existingConv.count++;
    } else {
      conversationCounts.set(convId, { count: 1, name: convName });
    }

    const hour = event.date.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }

  const topSenders = [...senderCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const topConversations = [...conversationCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  let peakHour = 0;
  let peakCount = 0;
  for (const [hour, count] of hourCounts) {
    if (count > peakCount) {
      peakHour = hour;
      peakCount = count;
    }
  }
  const peakHourStr = `${String(peakHour).padStart(2, '0')}:00-${String(peakHour).padStart(2, '0')}:59`;

  let msg = `📊 *Telegram Activity Summary — ${dateStr}*\n\n`;
  msg += `📨 *Total messages:* ${totalCount}\n`;
  msg += `👤 *Unique senders:* ${uniqueSenders.size}\n`;
  msg += `💬 *Unique conversations:* ${uniqueConversations.size}\n`;
  msg += `⏰ *Peak hour:* ${peakHourStr} (${peakCount} messages)\n`;

  msg += `\n👥 *Top Senders:*\n`;
  for (let i = 0; i < topSenders.length; i++) {
    msg += `${i + 1}. ${topSenders[i].name} — ${topSenders[i].count}\n`;
  }

  msg += `\n💬 *Top Conversations:*\n`;
  for (let i = 0; i < topConversations.length; i++) {
    msg += `${i + 1}. ${topConversations[i].name} — ${topConversations[i].count}\n`;
  }

  return msg;
}
