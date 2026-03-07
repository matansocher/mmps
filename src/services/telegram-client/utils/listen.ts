import { Api } from 'telegram';
import { NewMessage, type NewMessageEvent } from 'telegram/events';
import { Logger } from '@core/utils';
import { provideTelegramClient } from '../provide-telegram-client';

const logger = new Logger('TelegramClientListener');

type ListenerOptions = {
  readonly conversationsIds?: string[];
};

type TelegramMessage = {
  readonly id: number;
  readonly senderId: string;
  readonly chatId: string;
  readonly date: number;
  readonly text: string;
  readonly senderName: string;
};

type ConversationDetails = {
  readonly id: string;
  readonly createdDate: number;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
  readonly photo?: string;
};

type SenderDetails = {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
};

type ListenCallback = (message: TelegramMessage, conversation: ConversationDetails, sender: SenderDetails | null) => void | Promise<void>;

function buildConversationDetails(chat: Awaited<ReturnType<Api.Message['getChat']>>): ConversationDetails {
  if (!chat) return { id: '', createdDate: 0, title: '', firstName: '', lastName: '', userName: '' };
  if (chat instanceof Api.Chat || chat instanceof Api.Channel) {
    return {
      id: chat.id.toString(),
      createdDate: chat.date ?? 0,
      title: chat.title ?? '',
      firstName: '',
      lastName: '',
      userName: chat instanceof Api.Channel ? (chat.username ?? '') : '',
      photo: chat.photo ? 'has_photo' : undefined,
    };
  }
  return { id: chat.id?.toString() ?? '', createdDate: 0, title: '', firstName: '', lastName: '', userName: '' };
}

function buildSenderDetails(sender: Awaited<ReturnType<Api.Message['getSender']>>): SenderDetails | null {
  if (!sender) return null;
  if (sender instanceof Api.User) {
    return {
      id: sender.id.toString(),
      firstName: sender.firstName ?? '',
      lastName: sender.lastName ?? '',
      userName: sender.username ?? '',
    };
  }
  if (sender instanceof Api.Channel || sender instanceof Api.Chat) {
    return {
      id: sender.id.toString(),
      firstName: sender.title ?? '',
      lastName: '',
      userName: sender instanceof Api.Channel ? (sender.username ?? '') : '',
    };
  }
  return null;
}

export async function listen({ conversationsIds = [] }: ListenerOptions, callback: ListenCallback) {
  const telegramClient = await provideTelegramClient();

  const chats = conversationsIds.length > 0 ? conversationsIds.map(Number) : undefined;

  telegramClient.addEventHandler(async (event: NewMessageEvent) => {
    const msg = event.message;
    const [sender, chat] = await Promise.all([msg.getSender(), msg.getChat()]);

    const senderDetails = buildSenderDetails(sender);
    const senderName = senderDetails ? (senderDetails.userName || [senderDetails.firstName, senderDetails.lastName].filter(Boolean).join(' ') || 'Unknown') : 'Unknown';

    const telegramMessage: TelegramMessage = {
      id: msg.id,
      senderId: (msg.senderId ?? '').toString(),
      chatId: (msg.chatId ?? '').toString(),
      date: msg.date,
      text: msg.text,
      senderName,
    };

    const conversationDetails = buildConversationDetails(chat);

    try {
      await callback(telegramMessage, conversationDetails, senderDetails);
    } catch (err) {
      logger.error(`Error in listen callback: ${err}`);
    }
  }, new NewMessage({ chats }));
}
