import { formatAmount } from './format-amount';
import type { WeeklyDigestNumbers } from './build-weekly-digest-numbers';

export function fallbackWeeklyDigest(numbers: WeeklyDigestNumbers): string {
  const { thisWeek, week } = numbers;
  const totalsLine = thisWeek.totals.map((t) => formatAmount(t.total, t.currency)).join(' · ');
  const lines = [`*Weekly recap · ${week.from} → ${week.to}*`, `${thisWeek.count} transactions · ${totalsLine}`];
  if (thisWeek.topCategories.length > 0) {
    lines.push(
      `Top: ${thisWeek.topCategories
        .slice(0, 3)
        .map((c) => `${c.category} ${formatAmount(c.total, c.currency)}`)
        .join(' · ')}`,
    );
  }
  return lines.join('\n');
}
