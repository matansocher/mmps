import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { Module } from '@nestjs/common';
import { WoltService } from './wolt.service';
import { WoltUtilsService } from './wolt-utils.service';

@Module({
  imports: [LoggerModule.forChild(WoltModule.name), UtilsModule],
  providers: [WoltService, WoltUtilsService],
  exports: [WoltService, WoltUtilsService],
})
export class WoltModule {}
