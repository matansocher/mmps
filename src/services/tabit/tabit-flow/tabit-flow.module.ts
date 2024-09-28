import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { TabitMongoModule } from '@core/mongo/tabit-mongo/tabit-mongo.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { UtilsModule } from '@core/utils';
import { TabitApiModule } from '@services/tabit/tabit-api/tabit-api.module';
import { TabitUtilsService } from '@services/tabit/tabit-flow/tabit-utils.service';
import { FlowStepsHandlerService } from './flow-steps-handler.service';
import { FlowStepsManagerService } from './flow-steps-manager.service';

@Module({
  imports: [LoggerModule.forChild(TabitFlowModule.name), UtilsModule, TabitApiModule, TabitMongoModule, NotifierBotModule],
  providers: [FlowStepsHandlerService, FlowStepsManagerService, TabitUtilsService],
  exports: [FlowStepsManagerService, FlowStepsHandlerService, TabitUtilsService],
})
export class TabitFlowModule {}
