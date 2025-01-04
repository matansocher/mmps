import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { NotifierBotService, MY_USER_ID } from '@core/notifier-bot';
import { UtilsService } from '@core/utils';
import { Scores365Service } from '@services/scores-365';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { generateMatchResultsString } from './utils/generate-match-details-string';

const HOURS_TON_NOTIFY = [12, 19, 23];

@Injectable()
export class CoachBotSchedulerService {
  readonly chatIds = [MY_USER_ID];

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly scores365Service: Scores365Service,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.COACH.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`59 ${HOURS_TON_NOTIFY.join(',')} * * *`, { name: 'coach-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const responseText = await this.getMatchesSummaryMessage();
      if (!responseText) {
        return;
      }
      await Promise.all(this.chatIds.map((chatId) => this.telegramGeneralService.sendMessage(this.bot, chatId, responseText)));
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.handleIntervalFlow.name, errorMessage);
      this.notifierBotService.notify(BOTS.COACH.name, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }

  async getMatchesSummaryMessage(): Promise<string> {
    const competitions = await this.scores365Service.getCompetitions();
    if (!competitions?.length) {
      this.logger.error(this.handleIntervalFlow.name, 'error - could not get competitions');
      return;
    }
    const todayDateString = this.utilsService.getDateString(new Date());
    const competitionsWithMatches = await Promise.all(
      competitions.map((competition) => this.scores365Service.getMatchesForCompetition(competition, todayDateString)),
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
