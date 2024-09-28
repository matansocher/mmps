import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { OntopoMongoModule } from '@core/mongo/ontopo-mongo';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { OntopoApiModule } from '@services/ontopo/ontopo-api/ontopo-api.module';
import { OntopoFlowModule } from '@services/ontopo/ontopo-flow/ontopo-flow.module';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramModule } from '@services/telegram/telegram.module';
import { OntopoBotService } from './ontopo-bot.service';
import { OntopoSchedulerService } from './ontopo-scheduler.service';

@Module({
  imports: [
    LoggerModule.forChild(OntopoBotModule.name),
    NotifierBotModule,
    ScheduleModule.forRoot(),
    OntopoApiModule,
    OntopoFlowModule,
    OntopoMongoModule,
    TelegramBotsFactoryModule.forChild(BOTS.ONTOPO),
    TelegramModule,
    UtilsModule,
  ],
  providers: [OntopoBotService, OntopoSchedulerService],
})
export class OntopoBotModule {
  constructor(private readonly ontopoSchedulerService: OntopoSchedulerService) {}

  onModuleInit(): void {
    this.ontopoSchedulerService.scheduleInterval();
  }
}
