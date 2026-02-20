import { Logger } from '@core/utils';
import type { ConversationDetails, SenderDetails, TelegramMessage } from '@services/telegram-client';
import { saveEvent as saveEventToDb } from '../mongo';
import type { CreateSelfieEventData } from '../types';

const logger = new Logger('SelfieService');

export async function saveEvent(message: TelegramMessage, conversationDetails: ConversationDetails, sender: SenderDetails | null): Promise<void> {
  try {
    const data: CreateSelfieEventData = {
      messageId: message.id,
      text: message.text || null,
      date: new Date(message.date * 1000),
      isVoice: message.isVoice,
      voiceFileName: message.voice?.fileName || null,
      conversation: {
        id: conversationDetails.id,
        title: conversationDetails.title,
        firstName: conversationDetails.firstName,
        lastName: conversationDetails.lastName,
        userName: conversationDetails.userName,
      },
      sender: sender
        ? {
            id: sender.id,
            firstName: sender.firstName,
            lastName: sender.lastName,
            userName: sender.userName,
          }
        : null,
    };
    await saveEventToDb(data);
  } catch (err) {
    logger.error(`Failed to save selfie event: ${err}`);
  }
}
