import { LoggerModule } from '@core/logger/logger.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UtilsModule } from '@services/utils/utils.module';
import { WoltService } from './wolt.service';

@Module({
  imports: [LoggerModule, UtilsModule, HttpModule],
  providers: [WoltService],
  exports: [WoltService],
})
export class WoltModule {}
