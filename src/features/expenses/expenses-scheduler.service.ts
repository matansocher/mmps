import { addDays, endOfDay, startOfDay, subDays, subYears } from 'date-fns';
import type { Bot } from 'grammy';
import cron from 'node-cron';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { getAllExpenses, getExpensesBetween } from '@shared/expenses';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './expenses.config';
import { buildWeeklyDigestNumbers, generateWeeklyDigest, zonedDayRange } from './utils';

export class ExpensesSchedulerService {
  private readonly logger = new Logger(ExpensesSchedulerService.name);

  constructor(private readonly bot: Bot) {}

  init(): void {
    // Sundays at 09:00 Asia/Jerusalem — recap of the previous Sun–Sat week.
    cron.schedule('0 9 * * 0', () => this.sendWeeklyDigest(), { timezone: DEFAULT_TIMEZONE });
    this.logger.log('weekly digest scheduled · Sun 09:00 ' + DEFAULT_TIMEZONE);
  }

  async sendWeeklyDigest(): Promise<void> {
    try {
      const now = new Date();
      const { from: weekEnd } = zonedDayRange(subDays(now, 1));
      const weekStart = startOfDay(subDays(weekEnd, 6));

      const [thisWeek, last30, sameWeekLastYear, allHistorical] = await Promise.all([
        getExpensesBetween(weekStart, endOfDay(weekEnd)),
        getExpensesBetween(subDays(weekStart, 30), weekStart),
        getExpensesBetween(subYears(weekStart, 1), addDays(subYears(weekEnd, 1), 1)),
        getAllExpenses(),
      ]);

      if (thisWeek.length === 0) {
        this.logger.log('weekly digest skipped · no expenses last week');
        return;
      }

      const numbers = buildWeeklyDigestNumbers({ weekStart, weekEnd, thisWeek, last30, sameWeekLastYear, allHistorical });
      const digest = await generateWeeklyDigest(numbers);

      await this.bot.api.sendMessage(MY_USER_ID, digest, { parse_mode: 'Markdown' });
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.WEEKLY_DIGEST_SENT });
      this.logger.log('weekly digest sent');
    } catch (err) {
      this.logger.error(`weekly digest failed: ${err}`);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, error: 'weekly_digest_failed' });
    }
  }
}
