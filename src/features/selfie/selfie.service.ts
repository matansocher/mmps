import { TelegramClient } from 'telegram';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { SelfieMongoDayDetailsService } from '@core/mongo/selfie-mongo';
import { NotifierBotService } from '@core/notifier-bot/notifier-bot.service';
import { UtilsService } from '@core/utils';
import { IConversationDetails, ITelegramMessage, TELEGRAM_CLIENT_TOKEN, TelegramClientService } from '@services/telegram-client';

const selfieBotName = 'Selfie Bot';
const numberOfTopConversations = 5;

interface TopConversation {
  name: string;
  amount: number;
}

@Injectable()
export class SelfieService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramClientService: TelegramClientService,
    private readonly notifierBotService: NotifierBotService,
    private readonly selfieMongoDayDetailsService: SelfieMongoDayDetailsService,
    @Inject(TELEGRAM_CLIENT_TOKEN) private readonly telegramClient: TelegramClient,
  ) {}

  onModuleInit(): void {
    this.telegramClientService.listenToMessages(this.telegramClient, {}, this.handleMessage.bind(this));
  }

  async handleMessage(messageData: ITelegramMessage, conversationDetails: IConversationDetails): Promise<void> {
    try {
      const date = this.utilsService.getDateString();
      const { title, firstName, lastName, userName } = conversationDetails;
      const name = title || `${firstName} ${lastName}`.trim() || userName;
      await this.selfieMongoDayDetailsService.incrementDateItemsCount(conversationDetails.id, name, date);
    } catch (err) {
      this.logger.error(this.handleMessage.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  @Cron('0 0 * * *', { name: 'selfie-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleIntervalFlow(): Promise<void> {
    try {
      this.notifierBotService.notify(selfieBotName, { action: 'Daily started' }, null, null);
      const date = this.utilsService.getDateString();
      const todaysData = await this.selfieMongoDayDetailsService.getDateItems(date);
      if (!todaysData?.length) {
        return;
      }
      const totalMessages = todaysData.reduce((acc, curr) => acc + curr.messageCount, 0);
      const topConversations: TopConversation[] = todaysData
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, numberOfTopConversations)
        .map((data) => ({ name: data.conversationName, amount: data.messageCount }));

      const messageText = [
        `In the last day - ${date} You had a total of ${totalMessages} messages in ${todaysData.length} conversations.`,
        `Top conversations:\n${topConversations.map(({ name, amount }: TopConversation) => `- ${name} - ${amount}`).join('\n')}\n`,
      ].join('\n\n');
      this.notifierBotService.notify(selfieBotName, { action: 'Daily', plainText: messageText }, null, null);
    } catch (err) {
      const errorMessage = `error - ${this.utilsService.getErrorMessage(err)}`;
      this.logger.error(this.handleIntervalFlow.name, errorMessage);
    }
  }
}
