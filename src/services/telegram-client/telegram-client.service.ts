import { TelegramClient } from 'telegram';
import { Injectable, Logger } from '@nestjs/common';
import { ListenerOptions } from './interface';
import { EXCLUDED_CHANNELS, LISTEN_TO_EVENTS } from './telegram-client.config';
import { getConversationDetails, getMessageData } from './utils';

@Injectable()
export class TelegramClientService {
  private readonly logger = new Logger(TelegramClientService.name);

  listen(telegramClient: TelegramClient, listenerOptions: ListenerOptions, callback) {
    telegramClient.addEventHandler(async (event) => {
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
      const channelDetails = await getConversationDetails(telegramClient, entityId);
      if (!channelDetails?.id || EXCLUDED_CHANNELS.some((excludedChannel) => channelDetails.id.includes(excludedChannel))) {
        return;
      }
      return callback(messageData, channelDetails);
    });
  }
}
