import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import type { RailWakeService } from './rail-wake.service';

export class RailSchedulerService {
  private readonly logger = new Logger(RailSchedulerService.name);

  constructor(private readonly railWakeService: RailWakeService) {}

  init(): void {
    // Alerts live in Mongo, so a restart only delays the next tick - nothing is lost.
    cron.schedule('* * * * *', () => this.railWakeService.processDueAlerts().catch((err) => this.logger.error(`processDueAlerts failed: ${getErrorMessage(err)}`)), {
      timezone: DEFAULT_TIMEZONE,
    });
  }
}
