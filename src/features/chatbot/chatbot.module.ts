import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { ChatbotSchedulerService } from './chatbot-scheduler.service';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ChatbotController, ChatbotSchedulerService, ChatbotService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class ChatbotModule {}
