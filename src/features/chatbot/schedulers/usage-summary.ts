import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { formatNumber, getErrorMessage, Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { aggregateUsage } from '@shared/ai';
import type { UsageAggregateRow } from '@shared/ai';

const logger = new Logger('UsageSummaryScheduler');

const LOOKBACK_DAYS = 7;
const PREVIOUS_WEEKS = 3;

export async function usageSummary(bot: Bot): Promise<void> {
  try {
    const to = new Date();
    const from = subDays(to, LOOKBACK_DAYS);
    const comparisonFrom = subDays(to, LOOKBACK_DAYS * (PREVIOUS_WEEKS + 1));
    const rows = await aggregateUsage({ from: comparisonFrom, to });

    const weekStartDay = dayKey(from);
    const thisWeekRows = rows.filter((row) => row.day >= weekStartDay);

    if (!thisWeekRows.length) {
      await bot.api.sendMessage(MY_USER_ID, '💰 No AI usage recorded in the past week.');
      return;
    }

    const message = buildUsageSummaryMessage(rows, thisWeekRows, weekStartDay, from, to);
    await sendShortenedMessage(bot, MY_USER_ID, message, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Failed to send weekly usage summary: ${getErrorMessage(err)}`);
    await bot.api.sendMessage(MY_USER_ID, '⚠️ Failed to create the weekly usage summary.').catch(() => {});
  }
}

type Totals = { turns: number; tokens: number; cost: number };

function dayKey(date: Date): string {
  return format(toZonedTime(date, DEFAULT_TIMEZONE), 'yyyy-MM-dd');
}

function buildUsageSummaryMessage(allRows: UsageAggregateRow[], thisWeekRows: UsageAggregateRow[], weekStartDay: string, from: Date, to: Date): string {
  const totalTurns = thisWeekRows.reduce((sum, row) => sum + row.turns, 0);
  const totalTokens = thisWeekRows.reduce((sum, row) => sum + row.tokensTotal, 0);
  const totalCost = thisWeekRows.reduce((sum, row) => sum + row.cost, 0);

  const perSource = aggregateBy(thisWeekRows, (row) => row.source);

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
  lines.push(`*This week vs previous ${PREVIOUS_WEEKS}-week avg (by bot):*`);
  const previousRows = allRows.filter((row) => row.day < weekStartDay);
  const previousCostBySource = costBySource(previousRows);
  const thisWeekCostBySource = costBySource(thisWeekRows);
  const allSources = new Set<string>([...thisWeekCostBySource.keys(), ...previousCostBySource.keys()]);
  const comparison = [...allSources]
    .map((source) => {
      const thisWeekCost = thisWeekCostBySource.get(source) ?? 0;
      const prevAvgCost = (previousCostBySource.get(source) ?? 0) / PREVIOUS_WEEKS;
      return { source, thisWeekCost, prevAvgCost };
    })
    .sort((a, b) => b.thisWeekCost - a.thisWeekCost);
  for (const { source, thisWeekCost, prevAvgCost } of comparison) {
    lines.push(`• ${source}: $${thisWeekCost.toFixed(4)} vs $${prevAvgCost.toFixed(4)} avg ${formatDelta(thisWeekCost, prevAvgCost)}`);
  }

  return lines.join('\n');
}

function formatDelta(current: number, baseline: number): string {
  const diff = current - baseline;
  const arrow = diff > 0 ? '🔺' : diff < 0 ? '🔻' : '➖';
  if (baseline === 0) {
    return current === 0 ? '(➖ no change)' : '(🔺 new)';
  }
  const pct = (diff / baseline) * 100;
  return `(${arrow} ${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%)`;
}

function costBySource(rows: UsageAggregateRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.source, (map.get(row.source) ?? 0) + row.cost);
  }
  return map;
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
