import { Api } from 'telegram';
import { getErrorMessage, Logger } from '@core/utils';
import { provideTelegramClient } from '../provide-telegram-client';
import { Peer } from '../types';

const logger = new Logger('telegram-client:send-message');

type SendMessageOptions = {
  readonly name: string;
  readonly number: string;
  readonly message: string;
};

export async function sendMessage({ name, number, message }: SendMessageOptions): Promise<{ peer: Peer; id: number }> {
  try {
    const telegramClient = await provideTelegramClient();
    const result = await telegramClient.invoke(
      new Api.contacts.ImportContacts({
        contacts: [new Api.InputPhoneContact({ clientId: Date.now().toString() as any, phone: number, firstName: name, lastName: '' })],
      }),
    );

    const importedUser = result.users[0];
    if (!importedUser) {
      logger.warn('User not found or not on Telegram');
      return;
    }

    const sent = await telegramClient.sendMessage(importedUser, { message, parseMode: 'html' });

    return { peer: importedUser, id: sent.id };
  } catch (err) {
    logger.error(`Failed to send telegram-client message: ${getErrorMessage(err)}`);
    return;
  }
}
