import { Module } from '@nestjs/common';
import { WoltService } from './wolt.service';

@Module({
  providers: [WoltService],
  exports: [WoltService],
})
export class WoltModule {}
