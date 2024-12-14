import { Scores365Service } from 'src/services/scores-365';
import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { generateMatchResultsString } from './utils/generate-match-details-string';

@Injectable()
export class CoachBotSchedulerService {
  readonly chatIds = [MY_USER_ID];

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly scores365Service: Scores365Service,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.COACH.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`59 12,23 * * *`, { name: 'coach-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const competitions = await this.scores365Service.getCompetitions();
      if (!competitions?.length) {
        this.logger.error(this.handleIntervalFlow.name, 'error - could not get competitions');
        return;
      }
      const todayDateString = this.utilsService.getTodayDateString(new Date());
      const competitionsWithMatches = await Promise.all(competitions.map((competition) => this.scores365Service.getMatchesForCompetition(competition, todayDateString)));
      if (!competitionsWithMatches?.length) {
        this.logger.error(this.handleIntervalFlow.name, 'error - could not get matches');
        return;
      }

      const competitionsWithMatchesFiltered = competitionsWithMatches.filter(({ matches }) => matches?.length);
      const responseText = generateMatchResultsString(competitionsWithMatchesFiltered);
      await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, responseText)));
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.handleIntervalFlow.name, errorMessage);
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, errorMessage);
    }
  }
}
