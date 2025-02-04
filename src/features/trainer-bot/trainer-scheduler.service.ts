import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { TrainerMongoExerciseService } from '@core/mongo/trainer-mongo';
import { MY_USER_ID, NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS } from '@services/telegram';
import { SMART_REMINDER_HOUR_OF_DAY } from './trainer-bot.config';
import { TrainerService } from './trainer.service';
import { generateExerciseEncourageMessage, getStreak } from './utils';

@Injectable()
export class TrainerSchedulerService {
  private readonly logger = new Logger(TrainerSchedulerService.name);

  constructor(
    private readonly trainerService: TrainerService,
    private readonly mongoExerciseService: TrainerMongoExerciseService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.TRAINER.id) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${SMART_REMINDER_HOUR_OF_DAY} * * *`, { name: 'trainer-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleSmartReminder(): Promise<void> {
    try {
      const todayExercise = await this.mongoExerciseService.getTodayExercise(MY_USER_ID);
      if (todayExercise) {
        return;
      }
      const exercisesDates = await this.trainerService.getExercisesDates(MY_USER_ID);
      const currentStreak = getStreak(exercisesDates);
      const replyText = generateExerciseEncourageMessage({ currentStreak });
      await this.bot.sendMessage(MY_USER_ID, replyText);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      this.logger.error(`${this.handleSmartReminder.name} - error: ${errorMessage}`);
      this.notifierBotService.notify(BOTS.COACH, { action: 'ERROR', error: errorMessage }, null, null);
    }
  }
}
