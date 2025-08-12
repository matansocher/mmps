import { Api } from 'telegram';
import { Peer } from '../interface';
import { provideTelegramClient } from '../provide-telegram-client';

type EditMessageOptions = {
  readonly peer: Peer;
  readonly id: number;
  readonly message: string;
};

export async function editMessage({ peer, id, message }: EditMessageOptions): Promise<void> {
  const telegramClient = await provideTelegramClient();
  await telegramClient.invoke(new Api.messages.EditMessage({ peer, id, message }));
}
