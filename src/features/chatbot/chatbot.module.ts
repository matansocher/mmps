import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME as COACH_DB_NAME } from '@shared/coach/mongo';
import { DB_NAME as TRAINER_DB_NAME } from '@shared/trainer/mongo';
import { ChatbotSchedulerService } from './chatbot-scheduler.service';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ChatbotController, ChatbotSchedulerService, ChatbotService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class ChatbotModule implements OnModuleInit {
  async onModuleInit() {
    const mongoDbNames = [TRAINER_DB_NAME, COACH_DB_NAME];
    await Promise.all(mongoDbNames.map(async (mongoDbName) => createMongoConnection(mongoDbName)));
  }
}
