import { LoggerModule } from '@core/logger/logger.module';
import { OntopoMongoModule } from '@core/mongo/ontopo-mongo/ontopo-mongo.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils/utils.module';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OntopoApiModule } from '@services/ontopo/ontopo-api';
import { OntopoFlowModule } from '@services/ontopo/ontopo-flow';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { OntopoBotService } from './ontopo-bot.service';

@Module({
  imports: [
    LoggerModule.forChild(OntopoBotModule.name),
    NotifierBotModule,
    ScheduleModule.forRoot(),
    OntopoApiModule,
    OntopoFlowModule,
    OntopoMongoModule,
    // TelegramBotsFactoryModule.forChild(BOTS.ONTOPO),
    TelegramModule,
    UtilsModule,
  ],
  providers: [OntopoBotService],
})
export class OntopoBotModule {
  // constructor(private readonly ontopoSchedulerService: OntopoSchedulerService) {}
  //
  // onModuleInit(): void {
  //   this.ontopoSchedulerService.scheduleInterval();
  // }
}
