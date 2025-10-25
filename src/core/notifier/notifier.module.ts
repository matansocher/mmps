import { Module } from '@nestjs/common';
import { NotifierController } from './notifier.controller';
import { NotifierService } from './notifier.service';

@Module({
  providers: [NotifierController, NotifierService],
  exports: [NotifierService],
})
export class NotifierModule {}
