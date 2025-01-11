import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { WoltService } from './wolt.service';

@Module({
  imports: [LoggerModule.forChild(WoltModule.name)],
  providers: [WoltService],
  exports: [WoltService],
})
export class WoltModule {}
