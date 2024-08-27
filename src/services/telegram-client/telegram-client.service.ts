import { IListenerOptions } from '@services/telegram-client/interface';
import { Buffer } from 'buffer';
import { get as _get } from 'lodash';
import { Injectable } from '@nestjs/common';
import { IChannelDetails, ITelegramEvent, ITelegramMessage } from '@services/telegram-client/interface';
import { TelegramClient } from 'telegram';

@Injectable()
export class TelegramClientService {
  listenToMessages(telegramClient: TelegramClient, listenerOptions: IListenerOptions, callback) {
    telegramClient.addEventHandler(async (event) => {
      if (!listenerOptions.eventTypes.includes(event.className)) {
        return;
      }
      const messageData = this.getMessageData(event);
      if (listenerOptions.channelIds.includes(messageData.channelId)) {
        return;
      }
      const channelDetails = messageData.channelId ? await this.getChannelDetails(telegramClient, messageData.channelId) : null;
      return callback(messageData, channelDetails);
    });
  }

  getMessageData(event: ITelegramEvent): ITelegramMessage {
    return {
      id: _get(event, 'message.id', null),
      userId: _get(event, 'message.fromId.userId', null),
      channelId: _get(event, 'message.peerId.channelId', null),
      date: _get(event, 'message.date', null),
      text: _get(event, 'message.message', null),
    };
  }

  async getChannelDetails(telegramClient: TelegramClient, channelId: string): Promise<IChannelDetails> {
    const bigIntChannelId = BigInt(-1000000000000 - parseInt(channelId));
    const channelDetails = (await telegramClient.getEntity(bigIntChannelId.toString())) as any;
    // const photo = await this.getChannelPhoto(channelDetails);
    const photo = null;
    return {
      id: _get(channelDetails, 'id', null),
      createdDate: _get(channelDetails, 'date', null),
      title: _get(channelDetails, 'title', null),
      userName: _get(channelDetails, 'username', null),
      photo: photo,
    };
  }

  getChannelPhoto(channelDetails: IChannelDetails): string {
    let buffer = _get(channelDetails, 'photo.strippedThumb', null);
    if (!buffer?.length) {
      return null;
    }
    const imageBuffer = Buffer.from(buffer);
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;
    return dataUrl;
  }
}
