import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { TrainerMongoExerciseService } from '@core/mongo/trainer-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { BOTS } from '@services/telegram';

@Injectable()
export class TrainerService {
  constructor(
    private readonly mongoExerciseService: TrainerMongoExerciseService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.TRAINER.id) private readonly bot: TelegramBot,
  ) {}

  async getExercisesDates(chatId: number): Promise<Date[]> {
    const exercises = await this.mongoExerciseService.getExercises(chatId);
    return exercises.map((exercise) => exercise.createdAt);
  }
}
