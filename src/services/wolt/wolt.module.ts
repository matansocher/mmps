import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@core/utils/utils.module';
import { WoltUtilsService } from './wolt-utils.service';
import { WoltService } from './wolt.service';

@Module({
  imports: [LoggerModule.forChild(WoltModule.name), UtilsModule],
  providers: [WoltService, WoltUtilsService],
  exports: [WoltService, WoltUtilsService],
})
export class WoltModule {}
