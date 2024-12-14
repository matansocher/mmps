import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { Module } from '@nestjs/common';
import { Scores365Service } from './scores-365.service';

@Module({
  imports: [LoggerModule.forChild(Scores365Module.name), UtilsModule],
  providers: [Scores365Service],
  exports: [Scores365Service],
})
export class Scores365Module {}
