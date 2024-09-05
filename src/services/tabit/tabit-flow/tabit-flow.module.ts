import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { TabitMongoModule } from '@core/mongo/tabit-mongo/tabit-mongo.module';
import { UtilsModule } from '@core/utils/utils.module';
import { TabitApiModule } from '@services/tabit/tabit-api/tabit-api.module';
import { FlowStepsHandlerService } from './flow-steps-handler.service';
import { FlowStepsManagerService } from './flow-steps-manager.service';

@Module({
  imports: [
    LoggerModule.forChild(TabitFlowModule.name),
    UtilsModule,
    TabitApiModule,
    TabitMongoModule,
  ],
  providers: [FlowStepsHandlerService, FlowStepsManagerService],
  exports: [FlowStepsManagerService, FlowStepsHandlerService],
})
export class TabitFlowModule {}
