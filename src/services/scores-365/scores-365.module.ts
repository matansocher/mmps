import { LoggerModule } from '@core/logger';
import { Module } from '@nestjs/common';
import { Scores365Service } from './scores-365.service';

@Module({
  imports: [LoggerModule.forChild(Scores365Module.name)],
  providers: [Scores365Service],
  exports: [Scores365Service],
})
export class Scores365Module {}
