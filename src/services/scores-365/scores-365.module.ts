import { Module } from '@nestjs/common';
import { Scores365Service } from './scores-365.service';

@Module({
  providers: [Scores365Service],
  exports: [Scores365Service],
})
export class Scores365Module {}
