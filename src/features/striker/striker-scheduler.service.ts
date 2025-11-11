import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { startNewGame } from '@features/striker/utils';
import { notify } from '@services/notifier';
import { provideTelegramBot } from '@services/telegram';
import { getActiveUsers, getCurrentGame } from '@shared/striker';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './striker.config';

@Injectable()
export class StrikerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(StrikerSchedulerService.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  onModuleInit(): void {
    setTimeout(() => {
      // this.handleDailyGame(); // for testing purposes
    }, 8000);
  }

  @Cron(`0 15 * * *`, { name: 'striker-daily-game', timeZone: DEFAULT_TIMEZONE })
  async handleDailyGame(): Promise<void> {
    try {
      const users = await getActiveUsers();
      this.logger.log(`Starting daily game distribution to ${users.length} active users`);

      await Promise.allSettled(
        users.map(async ({ chatId }) => {
          const currentGame = await getCurrentGame(chatId);

          if (currentGame) {
            this.logger.debug(`User ${chatId} already has an active game, skipping daily game`);
            return null;
          }

          const { message } = await startNewGame(chatId);
          await this.bot.sendMessage(chatId, message);
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to send daily games: ${err}`);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, error: `Daily game scheduler failed: ${err}` });
    }
  }
}
