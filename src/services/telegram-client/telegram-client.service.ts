import { LoggerService } from '@core/logger';
import { get as _get } from 'lodash';
import { TelegramClient } from 'telegram';
import { Injectable } from '@nestjs/common';
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
    telegramClient.addEventHandler(async (event) => { // TODO: filter events out to see what events are interesting
      if (!LISTEN_TO_EVENTS.includes(event.className)) {
        return;
      }
      const messageData = this.getMessageData(event);
      if (!listenerOptions.channelIds.includes(messageData?.channelId?.toString())) {
        return;
      }
      const channelDetails = messageData.channelId ? await this.getChannelDetails(telegramClient, messageData.channelId) : null;
      if (!channelDetails?.id) {
        return;
      }
      console.log(event.className);
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
    // const photo = await this.getChannelPhoto(telegramClient, channelDetails);
    return {
      id: _get(channelDetails, 'id', null),
      createdDate: _get(channelDetails, 'date', null),
      title: _get(channelDetails, 'title', null),
      userName: _get(channelDetails, 'username', null),
      photo: null,
    };
  }

  async getChannelPhoto(telegramClient: TelegramClient, channelDetails) {
    // not working - we get a reconnect warning - probably something about the default timeout of the library
    try {
      if (!channelDetails?.photo) {
        return null;
      }
      const downloadedPhoto = await telegramClient.downloadProfilePhoto(channelDetails);
      if (downloadedPhoto) {
        // Convert Buffer to Base64 for inline usage, or use it as you need
        return `data:image/jpeg;base64,${downloadedPhoto.toString('base64')}`;
      }
    } catch (err) {
      this.logger.error(this.getChannelPhoto.name, `error - ${this.utilsService.getErrorMessage(err)}`);
    }
    // let buffer = _get(channelDetails, 'photo.strippedThumb', null);
    // if (!buffer?.length) {
    //   return null;
    // }
    // const imageBuffer = Buffer.from(buffer);
    // const base64Image = imageBuffer.toString('base64');
    // const dataUrl = `data:image/png;base64,${base64Image}`;
    // return dataUrl;
  }
}
