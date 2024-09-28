import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { OntopoMongoModule } from '@core/mongo/ontopo-mongo';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { OntopoUtilsService } from './ontopo-utils.service';
import { FlowStepsHandlerService } from './flow-steps-handler.service';
import { FlowStepsManagerService } from './flow-steps-manager.service';
import { OntopoApiModule } from '../ontopo-api/ontopo-api.module';

@Module({
  imports: [LoggerModule.forChild(OntopoFlowModule.name), UtilsModule, OntopoApiModule, OntopoMongoModule, NotifierBotModule],
  providers: [FlowStepsHandlerService, FlowStepsManagerService, OntopoUtilsService],
  exports: [FlowStepsManagerService, FlowStepsHandlerService, OntopoUtilsService],
})
export class OntopoFlowModule {}
