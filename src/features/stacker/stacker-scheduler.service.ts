import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getHourInTimezone, Logger } from '@core/utils';
import { findUsersForReminder } from '@shared/stacker';
import { StackerLauncherService } from './launcher.service';

export class StackerSchedulerService {
  private readonly logger = new Logger(StackerSchedulerService.name);

  constructor(private readonly launcher: StackerLauncherService) {}

  init(): void {
    cron.schedule('0 * * * *', () => this.handleHourlyReminders(), { timezone: DEFAULT_TIMEZONE });
  }

  private async handleHourlyReminders(): Promise<void> {
    try {
      const hour = getHourInTimezone(DEFAULT_TIMEZONE);
      const users = await findUsersForReminder(hour);
      if (users.length === 0) return;
      const results = await Promise.allSettled(users.map((user) => this.launcher.sendStreakReminder(user)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      this.logger.log(`Sent streak reminders to ${users.length - failed}/${users.length} users at hour ${hour}`);
    } catch (err) {
      this.logger.error(`Failed hourly reminder run, ${err}`);
    }
  }
}
