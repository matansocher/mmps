import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { NotifierBotService, MY_USER_ID } from '@core/notifier-bot';
import { Scores365Service } from '@services/scores-365';
import { BOTS } from '@services/telegram';
import { generateMatchResultsString } from './utils/generate-match-details-string';
import { getDateString, getErrorMessage, isDateStringFormat } from '@core/utils';

const HOURS_TON_NOTIFY = [12, 19, 23];

@Injectable()
export class CoachBotSchedulerService implements OnModuleInit {
  readonly chatIds = [MY_USER_ID];

  constructor(
    private readonly logger: LoggerService,
    private readonly scores365Service: Scores365Service,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.COACH.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    // this.handleIntervalFlow(); // for testing purposes
  }

  @Cron(`59 ${HOURS_TON_NOTIFY.join(',')} * * *`, { name: 'coach-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(date: string | null): Promise<void> {
    try {
      const dateString = isDateStringFormat(date) ? date : getDateString(new Date());
      const responseText = await this.getMatchesSummaryMessage(dateString);
      if (!responseText) {
        return;
      }
      await Promise.all(this.chatIds.map((chatId) => this.bot.sendMessage(chatId, responseText)));
    } catch (err) {
      const errorMessage = `error - ${getErrorMessage(err)}`;
      this.logger.error(this.handleIntervalFlow.name, errorMessage);
      this.notifierBotService.notify(BOTS.COACH.name, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }

  async getMatchesSummaryMessage(dateString: string): Promise<string> {
    const competitions = await this.scores365Service.getCompetitions();
    if (!competitions?.length) {
      this.logger.error(this.handleIntervalFlow.name, 'error - could not get competitions');
      return;
    }
    const competitionsWithMatches = await Promise.all(
      competitions.map((competition) => this.scores365Service.getMatchesForCompetition(competition, dateString)),
    );
    if (!competitionsWithMatches?.length) {
      this.logger.error(this.handleIntervalFlow.name, 'error - could not get matches');
      return;
    }

    const competitionsWithMatchesFiltered = competitionsWithMatches.filter(({ matches }) => matches?.length);
    if (!competitionsWithMatchesFiltered?.length) {
      this.logger.info(this.handleIntervalFlow.name, 'no competitions with matches found');
      return;
    }
    return generateMatchResultsString(competitionsWithMatchesFiltered);
  }
}
