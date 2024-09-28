import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { OntopoMongoModule } from '@core/mongo/ontopo-mongo/ontopo-mongo.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { OntopoApiModule } from '@services/ontopo/ontopo-api/ontopo-api.module';
import { OntopoUtilsService } from '@services/ontopo/ontopo-flow/ontopo-utils.service';
import { FlowStepsHandlerService } from './flow-steps-handler.service';
import { FlowStepsManagerService } from './flow-steps-manager.service';

@Module({
  imports: [LoggerModule.forChild(OntopoFlowModule.name), UtilsModule, OntopoApiModule, OntopoMongoModule, NotifierBotModule],
  providers: [FlowStepsHandlerService, FlowStepsManagerService, OntopoUtilsService],
  exports: [FlowStepsManagerService, FlowStepsHandlerService, OntopoUtilsService],
})
export class OntopoFlowModule {}
