import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { getActiveUsers } from '@shared/langly';
import { DAILY_CHALLENGE_HOURS } from './langly.config';
import { LanglyService } from './langly.service';

export class LanglyBotSchedulerService {
  private readonly logger = new Logger(LanglyBotSchedulerService.name);

  constructor(private readonly langlyService: LanglyService) {}

  init(): void {
    cron.schedule(
      `0 ${DAILY_CHALLENGE_HOURS.join(',')} * * *`,
      async () => {
        await this.handleDailyChallenge();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    setTimeout(() => {
      // this.handleDailyChallenge(); // for testing purposes
    }, 8000);
  }

  private async handleDailyChallenge(): Promise<void> {
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
