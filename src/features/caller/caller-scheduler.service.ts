import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { CallerMongoSubscriptionService } from '@core/mongo/caller-mongo';
import { getHourInTimezone } from '@core/utils';
import { phoneCall } from '@services/twilio';
import { BOT_CONFIG } from './caller.config';

@Injectable()
export class CallerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CallerSchedulerService.name);

  constructor(
    private readonly subscriptionDB: CallerMongoSubscriptionService,
    private readonly configService: ConfigService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.handleSchedule(); // for testing purposes
  }

  @Cron(`* * * * *`, { name: 'caller-daily-scheduler-start', timeZone: DEFAULT_TIMEZONE })
  async handleSchedule(): Promise<void> {
    const currentHour = getHourInTimezone(DEFAULT_TIMEZONE);
    const currentMinute = new Date().getMinutes();
    this.logger.log(`Current time in ${DEFAULT_TIMEZONE}: ${currentHour}:${currentMinute}`);

    const subscriptions = await this.subscriptionDB.getActiveSubscriptions();
    if (!subscriptions?.length) {
      return;
    }

    const subs = subscriptions.filter(({ time }) => {
      const hour = parseInt(time.slice(0, 2), 10);
      const minute = parseInt(time.slice(2, 4), 10);
      return currentHour === hour && currentMinute === minute;
    });
    await Promise.all(subs.map(async ({ chatId, time }) => this.handleSubscription(chatId, time)));
  }

  async handleSubscription(chatId: number, time: string): Promise<void> {
    try {
      const twilioPhoneNumber = this.configService.get('TWILIO_PHONE_NUMBER');
      const myPhoneNumber = this.configService.get('MY_PHONE_NUMBER');
      await phoneCall(twilioPhoneNumber, myPhoneNumber);
    } catch (err) {
      this.logger.error('Error handling subscription:', err);
      this.bot.sendMessage(chatId, `An error occurred while processing your subscription. Please try again later. ${err.message || err.toString()}`);
    } finally {
      this.subscriptionDB.archiveSubscription(chatId, time);
    }
  }
}
