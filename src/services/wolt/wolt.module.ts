import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@services/utils';
import { WoltUtilsService } from './wolt-utils.service';
import { WoltService } from './wolt.service';

@Module({
  imports: [LoggerModule.forRoot(WoltModule.name), UtilsModule],
  providers: [WoltService, WoltUtilsService],
  exports: [WoltService],
})
export class WoltModule {}
