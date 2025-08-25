import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierModule],
  providers: [ChatbotController, ChatbotService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class ChatbotModule {}
