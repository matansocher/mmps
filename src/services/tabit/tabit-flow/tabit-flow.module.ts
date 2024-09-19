import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { TabitMongoModule } from '@core/mongo/tabit-mongo/tabit-mongo.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils/utils.module';
import { TabitApiModule } from '@services/tabit/tabit-api';
import { TabitUtilsService } from '@services/tabit/tabit-flow';
import { FlowStepsHandlerService } from './flow-steps-handler.service';
import { FlowStepsManagerService } from './flow-steps-manager.service';

@Module({
  imports: [LoggerModule.forChild(TabitFlowModule.name), UtilsModule, TabitApiModule, TabitMongoModule, NotifierBotModule],
  providers: [FlowStepsHandlerService, FlowStepsManagerService, TabitUtilsService],
  exports: [FlowStepsManagerService, FlowStepsHandlerService, TabitUtilsService],
})
export class TabitFlowModule {}
