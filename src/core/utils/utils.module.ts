import { LoggerModule } from '@core/logger';
import { Module } from '@nestjs/common';
import { UtilsService } from './utils.service';

@Module({
  imports: [LoggerModule.forChild(UtilsModule.name)],
  providers: [UtilsService],
  exports: [UtilsService],
})
export class UtilsModule {}
