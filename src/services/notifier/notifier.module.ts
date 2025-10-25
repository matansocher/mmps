import { Module } from '@nestjs/common';
import { NotifierController } from './notifier.controller';

@Module({
  providers: [NotifierController],
})
export class NotifierModule {}
