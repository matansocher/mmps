import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { FunFactsBotService } from './fun-facts-bot.service';
import { FunFactsSchedulerService } from './fun-facts-scheduler.service';

@Module({
  imports: [
    LoggerModule.forChild(FunFactsBotModule.name),
    UtilsModule,
    TelegramBotsFactoryModule.forChild(BOTS.FUN_FACTS),
    TelegramModule,
    OpenaiModule,
    ScheduleModule.forRoot(),
  ],
  providers: [FunFactsBotService, FunFactsSchedulerService],
})
export class FunFactsBotModule implements OnModuleInit {
  constructor(private readonly funFactsSchedulerService: FunFactsSchedulerService) {}

  onModuleInit(): void {
    this.funFactsSchedulerService.handleIntervalFlow(); // for testing purposes
  }
}
