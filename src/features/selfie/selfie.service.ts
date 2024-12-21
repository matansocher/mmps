import { ANALYTIC_EVENT_NAMES } from '@services/wolt';
import { TelegramClient } from 'telegram';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { UtilsService } from '@core/utils';
import { IChannelDetails, ITelegramMessage, TELEGRAM_CLIENT_TOKEN, TelegramClientService } from '@services/telegram-client';

const selfieBotName = 'Selfie Bot';

@Injectable()
export class SelfieService implements OnModuleInit {
  readonly messagesCount: Record<string, number> = {};

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramClientService: TelegramClientService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(TELEGRAM_CLIENT_TOKEN) private readonly telegramClient: TelegramClient,
  ) {}

  onModuleInit(): void {
    this.telegramClientService.listenToMessages(this.telegramClient, {}, this.handleMessage.bind(this));
  }

  async handleMessage(messageData: ITelegramMessage, channelDetails: IChannelDetails): Promise<void> {
    try {
      this.messagesCount[channelDetails.id] = this.messagesCount[channelDetails.id] ? this.messagesCount[channelDetails.id] + 1 : 1;
    } catch (err) {
      this.logger.error(this.handleMessage.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  @Cron('0 0 * * *', { name: 'selfie-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      const totalMessages = Object.values(this.messagesCount).reduce((acc, curr) => acc + curr, 0);
      const topChannels = Object.entries(this.messagesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const messageText = [
        `Today You had a total of ${totalMessages} messages in ${Object.keys(this.messagesCount).length} channels.`,
        `Top channels:\n${topChannels.map(([channel, count]) => `- ${channel} - ${count}`).join('\n')}`,
      ].join('\n\n');
      this.notifierBotService.notify(selfieBotName, { action: 'Daily', plainText: messageText }, null, null);
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.handleIntervalFlow.name, errorMessage);
      this.notifierBotService.notify(selfieBotName, { action: ANALYTIC_EVENT_NAMES.ERROR, error: errorMessage, method: this.handleIntervalFlow.name }, null, null);
    }
  }
}
