import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { WoltUtilsService } from './wolt-utils.service';
import { WoltService } from './wolt.service';

@Module({
  imports: [LoggerModule.forChild(WoltModule.name), UtilsModule],
  providers: [WoltService, WoltUtilsService],
  exports: [WoltService, WoltUtilsService],
})
export class WoltModule {}
