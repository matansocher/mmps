import { LoggerModule } from '@core/logger/logger.module';
import { Module } from '@nestjs/common';
import { UtilsModule } from '@services/utils/utils.module';
import { WoltService } from './wolt.service';

@Module({
  imports: [LoggerModule, UtilsModule],
  providers: [WoltService],
  exports: [WoltService],
})
export class WoltModule {}
