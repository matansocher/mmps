import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { formatNumber, Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { aggregateUsage } from '../mongo';
import type { UsageAggregateRow } from '../mongo';

const logger = new Logger('UsageSummaryScheduler');

const LOOKBACK_DAYS = 7;

export async function usageSummary(bot: Bot): Promise<void> {
  try {
    const to = new Date();
    const from = subDays(to, LOOKBACK_DAYS);
    const rows = await aggregateUsage({ from, to });

    if (!rows.length) {
      await bot.api.sendMessage(MY_USER_ID, '💰 No chatbot usage recorded in the past week.');
      return;
    }

    const message = buildUsageSummaryMessage(rows, from, to);
    await sendShortenedMessage(bot, MY_USER_ID, message, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Failed to send weekly usage summary: ${err}`);
    await bot.api.sendMessage(MY_USER_ID, '⚠️ Failed to create the weekly usage summary.').catch(() => {});
  }
}

function buildUsageSummaryMessage(rows: UsageAggregateRow[], from: Date, to: Date): string {
  const totalTurns = rows.reduce((sum, row) => sum + row.turns, 0);
  const totalTokens = rows.reduce((sum, row) => sum + row.tokensTotal, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

  const perDay = new Map<string, { turns: number; cost: number }>();
  for (const row of rows) {
    const entry = perDay.get(row.day) ?? { turns: 0, cost: 0 };
    entry.turns += row.turns;
    entry.cost += row.cost;
    perDay.set(row.day, entry);
  }

  const perUser = new Map<number, { turns: number; cost: number }>();
  for (const row of rows) {
    const entry = perUser.get(row.chatId) ?? { turns: 0, cost: 0 };
    entry.turns += row.turns;
    entry.cost += row.cost;
    perUser.set(row.chatId, entry);
  }

  const fromLabel = format(toZonedTime(from, DEFAULT_TIMEZONE), 'MMM d');
  const toLabel = format(toZonedTime(to, DEFAULT_TIMEZONE), 'MMM d');

  const lines: string[] = [];
  lines.push(`💰 *Chatbot weekly usage* (${fromLabel}–${toLabel})`);
  lines.push('');
  lines.push(`*Total cost:* $${totalCost.toFixed(4)}`);
  lines.push(`*Turns:* ${totalTurns}`);
  lines.push(`*Tokens:* ${formatNumber(totalTokens)}`);
  lines.push(`*Avg cost/turn:* $${(totalCost / totalTurns).toFixed(6)}`);

  const days = [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  lines.push('');
  lines.push('*By day:*');
  for (const [day, entry] of days) {
    lines.push(`• ${day}: $${entry.cost.toFixed(4)} · ${entry.turns} turns`);
  }

  if (perUser.size > 1) {
    const users = [...perUser.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 5);
    lines.push('');
    lines.push('*Top users:*');
    for (const [chatId, entry] of users) {
      lines.push(`• \`${chatId}\`: $${entry.cost.toFixed(4)} · ${entry.turns} turns`);
    }
  }

  return lines.join('\n');
}
