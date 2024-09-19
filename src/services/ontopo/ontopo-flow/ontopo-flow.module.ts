import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { OntopoMongoModule } from '@core/mongo/ontopo-mongo/ontopo-mongo.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils/utils.module';
import { OntopoApiModule } from '@services/ontopo/ontopo-api';
import { OntopoUtilsService } from '@services/ontopo/ontopo-flow';
import { FlowStepsHandlerService } from './flow-steps-handler.service';
import { FlowStepsManagerService } from './flow-steps-manager.service';

@Module({
  imports: [LoggerModule.forChild(OntopoFlowModule.name), UtilsModule, OntopoApiModule, OntopoMongoModule, NotifierBotModule],
  providers: [FlowStepsHandlerService, FlowStepsManagerService, OntopoUtilsService],
  exports: [FlowStepsManagerService, FlowStepsHandlerService, OntopoUtilsService],
})
export class OntopoFlowModule {}
