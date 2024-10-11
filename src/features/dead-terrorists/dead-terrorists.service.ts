import { TelegramClient } from 'telegram';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { TELEGRAM_CLIENT_TOKEN, TelegramClientService } from '@services/telegram-client';
import { TELEGRAM_CHANNELS_TO_LISTEN } from './dead-terrorists.config';

@Injectable()
export class DeadTerroristsService implements OnModuleInit {
  constructor(
    private readonly telegramClientService: TelegramClientService,
    @Inject(TELEGRAM_CLIENT_TOKEN) private readonly telegramClient: TelegramClient,
  ) {}

  onModuleInit() {
    const listenerOptions = { channelIds: TELEGRAM_CHANNELS_TO_LISTEN };
    this.telegramClientService.listenToMessages(this.telegramClient, listenerOptions, this.handleMessage);
  }

  async handleMessage(messageData: any, channelDetails: any) {
    console.log('messageData');
    console.log(messageData);
    console.log('channelDetails');
    console.log(channelDetails);
  }
}
