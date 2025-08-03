import { TelegramClient } from 'telegram';
import { Api } from 'telegram';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EXCLUDED_CHANNELS, LISTEN_TO_EVENTS, TELEGRAM_CLIENT_TOKEN } from './telegram-client.config';
import { getConversationDetails, getMessageData } from './utils';

export type ListenerOptions = {
  readonly conversationsIds?: string[];
};

export type SendMessageOptions = {
  readonly name: string;
  readonly number: string;
  readonly message: string;
};

@Injectable()
export class TelegramClientService {
  private readonly logger = new Logger(TelegramClientService.name);

  constructor(@Inject(TELEGRAM_CLIENT_TOKEN) private readonly telegramClient: TelegramClient) {}

  listen(listenerOptions: ListenerOptions, callback) {
    this.telegramClient.addEventHandler(async (event) => {
      if (!LISTEN_TO_EVENTS.includes(event.className)) {
        return;
      }
      const messageData = getMessageData(event);
      if (!messageData?.text) {
        return;
      }
      if (listenerOptions?.conversationsIds?.length && !listenerOptions.conversationsIds.includes(messageData?.channelId?.toString())) {
        return;
      }
      const entityId = messageData.channelId ? `-100${messageData.channelId}` : messageData.userId.toString();
      const channelDetails = await getConversationDetails(this.telegramClient, entityId);
      if (!channelDetails?.id || EXCLUDED_CHANNELS.some((excludedChannel) => channelDetails.id.includes(excludedChannel))) {
        return;
      }
      return callback(messageData, channelDetails);
    });
  }

  async sendMessage({ name, number, message }: SendMessageOptions) {
    // Step 1: Import contact by phone number
    const result = await this.telegramClient.invoke(
      new Api.contacts.ImportContacts({
        contacts: [new Api.InputPhoneContact({ clientId: Date.now().toString() as any, phone: number, firstName: name, lastName: name })],
      }),
    );

    // Step 2: Extract user ID from response
    const importedUser = result.users[0];
    if (!importedUser) {
      console.log('User not found or not on Telegram');
      return;
    }

    // Step 3: Send message
    await this.telegramClient.sendMessage(importedUser, { message });
  }
}
