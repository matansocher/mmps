import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import type { WorldCupService } from './world-cup.service';

export class WorldCupSchedulerService {
  private readonly logger = new Logger(WorldCupSchedulerService.name);

  constructor(private readonly worldCupService: WorldCupService) {}

  init(): void {
    // Daily reminder at 09:00 Asia/Jerusalem for today's matches
    cron.schedule('0 9 * * *', () => this.handleDailyReminder(), { timezone: DEFAULT_TIMEZONE });
    this.logger.log('World Cup schedulers initialized');
  }

  private async handleDailyReminder(): Promise<void> {
    try {
      await this.worldCupService.sendMatchdayReminders();
    } catch (err) {
      this.logger.error(`handleDailyReminder error: ${err}`);
    }
  }
}
