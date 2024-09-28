import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { OntopoMongoModule } from '@core/mongo/ontopo-mongo';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { OntopoApiModule, OntopoFlowModule } from '@services/ontopo';
import { BOTS, TelegramModule, TelegramBotsFactoryModule } from '@services/telegram';
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
export class OntopoBotModule implements OnModuleInit {
  constructor(private readonly ontopoSchedulerService: OntopoSchedulerService) {}

  onModuleInit(): void {
    this.ontopoSchedulerService.scheduleInterval();
  }
}
