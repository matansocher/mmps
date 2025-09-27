import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { DAILY_CHALLENGE_HOURS } from './langly.config';
import { LanglyService } from './langly.service';

@Injectable()
export class LanglyBotSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(LanglyBotSchedulerService.name);

  constructor(private readonly langlyService: LanglyService) {}

  onModuleInit(): void {
    // Uncomment for testing
    // this.handleDailyChallenge();
  }

  @Cron(`0 ${DAILY_CHALLENGE_HOURS.join(',')} * * *`, { name: 'langly-daily-challenge', timeZone: DEFAULT_TIMEZONE })
  async handleDailyChallenge(): Promise<void> {
    try {
      await this.langlyService.sendChallenge(MY_USER_ID);
      this.logger.log(`Daily Spanish challenge sent at ${new Date().toISOString()}`);
    } catch (err) {
      this.logger.error(`Failed to send daily challenge, ${err}`);
    }
  }
}
