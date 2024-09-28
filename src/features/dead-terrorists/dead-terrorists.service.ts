import { TelegramClient } from 'telegram';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CHANNELS, TELEGRAM_CLIENT_TOKEN, TelegramClientService } from '@services/telegram-client';

@Injectable()
export class DeadTerroristsService implements OnModuleInit {
  constructor(
    private readonly telegramClientService: TelegramClientService,
    @Inject(TELEGRAM_CLIENT_TOKEN) private readonly telegramClient: TelegramClient,
  ) {}

  onModuleInit() {
    const listenerOptions = { eventTypes: ['UpdateNewChannelMessage'], channelIds: CHANNELS.map((c) => c.id) };
    this.telegramClientService.listenToMessages(this.telegramClient, listenerOptions, this.handleMessage);
  }

  async handleMessage(messageData: any, channelDetails: any) {
    console.log('\n');
    console.log('messageData');
    console.log(messageData);
    console.log('\n');
    console.log('channelDetails');
    console.log(channelDetails);
    console.log('\n');
  }
}
