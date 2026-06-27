import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { formatNumber, Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { aggregateUsage } from '@shared/ai';
import type { UsageAggregateRow } from '@shared/ai';

const logger = new Logger('UsageSummaryScheduler');

const LOOKBACK_DAYS = 7;

export async function usageSummary(bot: Bot): Promise<void> {
  try {
    const to = new Date();
    const from = subDays(to, LOOKBACK_DAYS);
    const rows = await aggregateUsage({ from, to });

    if (!rows.length) {
      await bot.api.sendMessage(MY_USER_ID, '💰 No AI usage recorded in the past week.');
      return;
    }

    const message = buildUsageSummaryMessage(rows, from, to);
    await sendShortenedMessage(bot, MY_USER_ID, message, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Failed to send weekly usage summary: ${err}`);
    await bot.api.sendMessage(MY_USER_ID, '⚠️ Failed to create the weekly usage summary.').catch(() => {});
  }
}

type Totals = { turns: number; tokens: number; cost: number };

function buildUsageSummaryMessage(rows: UsageAggregateRow[], from: Date, to: Date): string {
  const totalTurns = rows.reduce((sum, row) => sum + row.turns, 0);
  const totalTokens = rows.reduce((sum, row) => sum + row.tokensTotal, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

  const perSource = aggregateBy(rows, (row) => row.source);
  const perDay = aggregateBy(rows, (row) => row.day);

  const fromLabel = format(toZonedTime(from, DEFAULT_TIMEZONE), 'MMM d');
  const toLabel = format(toZonedTime(to, DEFAULT_TIMEZONE), 'MMM d');

  const lines: string[] = [];
  lines.push(`💰 *AI weekly usage* (${fromLabel}–${toLabel})`);
  lines.push('');
  lines.push(`*Total cost:* $${totalCost.toFixed(4)}`);
  lines.push(`*Turns:* ${totalTurns}`);
  lines.push(`*Tokens:* ${formatNumber(totalTokens)}`);

  lines.push('');
  lines.push('*By bot:*');
  const sources = [...perSource.entries()].sort((a, b) => b[1].cost - a[1].cost);
  for (const [source, entry] of sources) {
    lines.push(`• ${source}: $${entry.cost.toFixed(4)} · ${entry.turns} turns · ${formatNumber(entry.tokens)} tokens`);
  }

  lines.push('');
  lines.push('*By day:*');
  const days = [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [day, entry] of days) {
    lines.push(`• ${day}: $${entry.cost.toFixed(4)} · ${entry.turns} turns`);
  }

  return lines.join('\n');
}

function aggregateBy(rows: UsageAggregateRow[], keyFn: (row: UsageAggregateRow) => string): Map<string, Totals> {
  const map = new Map<string, Totals>();
  for (const row of rows) {
    const key = keyFn(row);
    const entry = map.get(key) ?? { turns: 0, tokens: 0, cost: 0 };
    entry.turns += row.turns;
    entry.tokens += row.tokensTotal;
    entry.cost += row.cost;
    map.set(key, entry);
  }
  return map;
}
