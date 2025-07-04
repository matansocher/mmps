import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';

const SMART_REMINDER_HOUR_OF_DAY = 12;

@Injectable()
export class CallerSchedulerService implements OnModuleInit {
  // constructor(private readonly callerService: CallerService) {}

  onModuleInit(): void {
    // this.handleEODReminder(); // for testing purposes
  }

  @Cron(`0 ${SMART_REMINDER_HOUR_OF_DAY} * * *`, { name: 'caller-daily-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleEODReminder(): Promise<void> {
    // this.callerService.processEODReminder();
  }
}
