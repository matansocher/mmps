import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@core/utils/utils.module';
import { TabitApiService } from './tabit-api.service';

@Module({
  imports: [LoggerModule.forChild(TabitApiModule.name), UtilsModule],
  providers: [TabitApiService],
  exports: [TabitApiService],
})
export class TabitApiModule {}
