import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { getActiveUsers } from '@shared/langly';
import { DAILY_CHALLENGE_HOURS } from './langly.config';
import { LanglyService } from './langly.service';

@Injectable()
export class LanglyBotSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(LanglyBotSchedulerService.name);

  constructor(private readonly langlyService: LanglyService) {}

  onModuleInit(): void {
    setTimeout(() => {
      // this.handleDailyChallenge(); // for testing purposes
    }, 8000);
  }

  @Cron(`0 ${DAILY_CHALLENGE_HOURS.join(',')} * * *`, { name: 'langly-daily-challenge', timeZone: DEFAULT_TIMEZONE })
  async handleDailyChallenge(): Promise<void> {
    try {
      const users = await getActiveUsers();
      const chatIds = users.map((user) => user.chatId);
      await Promise.all(chatIds.map((chatId) => this.langlyService.sendChallenge(chatId)));
      this.logger.log(`Daily Spanish challenge sent to ${chatIds.length} users at ${new Date().toISOString()}`);
    } catch (err) {
      this.logger.error(`Failed to send daily challenge, ${err}`);
    }
  }
}
