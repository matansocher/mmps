import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { DB_NAME as EDUCATOR_DB_NAME } from '@features/educator/mongo';
import { DB_NAME as TRAINER_DB_NAME } from '@features/trainer/mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
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
    await createMongoConnection(TRAINER_DB_NAME);
    await createMongoConnection(EDUCATOR_DB_NAME);
  }
}
