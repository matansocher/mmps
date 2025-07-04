import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CallerSchedulerService } from './caller-scheduler.service';
import { CallerController } from './caller.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [CallerController],
  providers: [CallerSchedulerService],
})
export class CallerModule {}
