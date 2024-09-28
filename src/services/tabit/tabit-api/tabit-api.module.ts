import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { TabitApiService } from './tabit-api.service';

@Module({
  imports: [LoggerModule.forChild(TabitApiModule.name), UtilsModule],
  providers: [TabitApiService],
  exports: [TabitApiService],
})
export class TabitApiModule {}
