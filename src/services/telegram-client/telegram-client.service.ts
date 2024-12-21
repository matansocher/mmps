import { get as _get } from 'lodash';
import { TelegramClient, Api } from 'telegram';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { UtilsService } from '@core/utils';
import { IChannelDetails, ITelegramEvent, ITelegramMessage, IListenerOptions } from './interface';
import { LISTEN_TO_EVENTS } from './telegram-client.config';

@Injectable()
export class TelegramClientService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
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
      if (listenerOptions?.channelIds?.length && !listenerOptions.channelIds.includes(messageData?.channelId?.toString())) {
        return;
      }
      const entityId = messageData.channelId ? `-100${messageData.channelId}` : messageData.userId.toString();
      const channelDetails = await this.getChannelDetails(telegramClient, entityId);
      if (!channelDetails?.id) {
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

  async getChannelDetails(telegramClient: TelegramClient, entityId: string): Promise<IChannelDetails> {
    const channelDetails = (await telegramClient.getEntity(entityId)) as any;
    // const photo = await this.getChannelPhoto(telegramClient, channelDetails);
    this.logger.info(this.getChannelDetails.name, `channelDetails: ${JSON.stringify(channelDetails)}`);
    return {
      id: _get(channelDetails, 'id', null).toString(),
      createdDate: _get(channelDetails, 'date', null),
      title: _get(channelDetails, 'title', null),
      userName: _get(channelDetails, 'username', null),
      photo: null,
    };
  }

  async getChannelPhoto(telegramClient: TelegramClient, channelDetails) {
    try {
      const { id, accessHash } = channelDetails;
      const channelPeer = new Api.InputPeerChannel({ channelId: id, accessHash: accessHash });
      const file = await telegramClient.downloadProfilePhoto(channelPeer);
      return file;
    } catch (err) {
      this.logger.error(this.getChannelPhoto.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return null;
    }
  }
}
