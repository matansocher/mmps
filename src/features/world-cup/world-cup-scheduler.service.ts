import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import type { WorldCupService } from './world-cup.service';

export class WorldCupSchedulerService {
  private readonly logger = new Logger(WorldCupSchedulerService.name);

  constructor(private readonly worldCupService: WorldCupService) {}

  init(): void {
    // 11:00 — summary of yesterday's finished matches (games played in US timezones finish late Israel time)
    cron.schedule('0 11 * * *', () => this.handleDailyDigest(), { timezone: DEFAULT_TIMEZONE });
    // 19:00 — reminder to set predictions for today's matches
    cron.schedule('0 19 * * *', () => this.handleDailyReminder(), { timezone: DEFAULT_TIMEZONE });
    this.logger.log('World Cup schedulers initialized');
  }

  private async handleDailyReminder(): Promise<void> {
    try {
      await this.worldCupService.sendMatchdayReminders();
    } catch (err) {
      this.logger.error(`handleDailyReminder error: ${err}`);
    }
  }

  private async handleDailyDigest(): Promise<void> {
    try {
      await this.worldCupService.sendDailyDigest();
    } catch (err) {
      this.logger.error(`handleDailyDigest error: ${err}`);
    }
  }
}
