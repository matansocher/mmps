import { get as _get } from 'lodash';
import { TelegramClient } from 'telegram';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { IConversationDetails, ITelegramEvent, ITelegramMessage, IListenerOptions } from './interface';
import { EXCLUDED_CHANNELS, LISTEN_TO_EVENTS } from './telegram-client.config';

@Injectable()
export class TelegramClientService {
  constructor(
    private readonly logger: LoggerService,
  ) {}

  listenToMessages(telegramClient: TelegramClient, listenerOptions: IListenerOptions, callback) {
    telegramClient.addEventHandler(async (event) => {
      if (!LISTEN_TO_EVENTS.includes(event.className)) {
        return;
      }
      const messageData = this.getMessageData(event);
      if (!messageData?.text) {
        return;
      }
      if (listenerOptions?.conversationsIds?.length && !listenerOptions.conversationsIds.includes(messageData?.channelId?.toString())) {
        return;
      }
      const entityId = messageData.channelId ? `-100${messageData.channelId}` : messageData.userId.toString();
      const channelDetails = await this.getConversationDetails(telegramClient, entityId);
      if (!channelDetails?.id || EXCLUDED_CHANNELS.some((excludedChannel) => channelDetails.id.includes(excludedChannel))) {
        return;
      }
      return callback(messageData, channelDetails);
    });
  }

  getMessageData(event: ITelegramEvent): ITelegramMessage {
    return {
      id: _get(event, 'message.id', _get(event, 'id', null)),
      userId: _get(event, 'message.fromId.userId', _get(event, 'userId', _get(event, 'message.peerId.userId', null))),
      channelId: _get(event, 'message.peerId.channelId', '').toString(),
      date: _get(event, 'message.date', _get(event, 'date', null)),
      text: _get(event, 'message.message', _get(event, 'message', null)),
    };
  }

  async getConversationDetails(telegramClient: TelegramClient, entityId: string): Promise<IConversationDetails> {
    const channelDetails = (await telegramClient.getEntity(entityId)) as any;
    return {
      id: _get(channelDetails, 'id', null).toString(),
      createdDate: _get(channelDetails, 'date', null),
      title: _get(channelDetails, 'title', null),
      firstName: _get(channelDetails, 'firstName', null),
      lastName: _get(channelDetails, 'lastName', null),
      userName: _get(channelDetails, 'username', null),
      photo: null,
    };
  }
}
