import type { Bot } from 'grammy';
import type { Chat, Message, User } from 'grammy/types';

export type CapturedCall = {
  readonly method: string;
  readonly payload: Record<string, any>;
  readonly timestamp: number;
};

export type MockTransport = {
  readonly calls: ReadonlyArray<CapturedCall>;
  readonly callsByMethod: (method: string) => ReadonlyArray<CapturedCall>;
  readonly textsSent: () => ReadonlyArray<string>;
  readonly lastCall: () => CapturedCall | undefined;
  readonly clear: () => void;
};

const FAKE_BOT_USER: User = {
  id: 1,
  is_bot: true,
  first_name: 'TestBot',
  username: 'test_bot',
};

function buildFakeChat(chatId: number): Chat.PrivateChat {
  return {
    id: chatId,
    type: 'private',
    first_name: 'TestUser',
  };
}

function buildFakeMessage(messageId: number, chatId: number, payload: Record<string, any>): Message {
  const base: Message = {
    message_id: messageId,
    date: Math.floor(Date.now() / 1000),
    chat: buildFakeChat(chatId),
    from: FAKE_BOT_USER,
  };
  if (typeof payload.text === 'string') {
    (base as any).text = payload.text;
  }
  if (typeof payload.caption === 'string') {
    (base as any).caption = payload.caption;
  }
  if (payload.reply_markup) {
    (base as any).reply_markup = payload.reply_markup;
  }
  return base;
}

export function createMockTransport(bot: Bot): MockTransport {
  const calls: CapturedCall[] = [];
  let nextMessageId = 1000;

  bot.api.config.use(async (_prev, method, payload) => {
    const recorded: CapturedCall = {
      method,
      payload: { ...(payload as Record<string, any>) },
      timestamp: Date.now(),
    };
    calls.push(recorded);

    const p = payload as Record<string, any>;
    const chatId = typeof p.chat_id === 'number' ? p.chat_id : 0;

    switch (method) {
      case 'sendMessage':
      case 'sendRichMessage':
      case 'sendPhoto':
      case 'sendVoice':
      case 'sendAudio':
      case 'sendDocument':
      case 'sendVideo':
      case 'sendAnimation':
      case 'sendSticker':
      case 'sendLocation':
      case 'sendContact':
      case 'sendDice':
      case 'sendPoll':
      case 'sendVenue':
      case 'sendMediaGroup':
      case 'copyMessage':
      case 'forwardMessage': {
        const messageId = nextMessageId++;
        return { ok: true, result: buildFakeMessage(messageId, chatId, p) } as any;
      }
      case 'editMessageText':
      case 'editMessageCaption':
      case 'editMessageMedia':
      case 'editMessageReplyMarkup': {
        const messageId = typeof p.message_id === 'number' ? p.message_id : nextMessageId++;
        return { ok: true, result: buildFakeMessage(messageId, chatId, p) } as any;
      }
      case 'getMe':
        return { ok: true, result: FAKE_BOT_USER } as any;
      default:
        return { ok: true, result: true } as any;
    }
  });

  return {
    get calls() {
      return calls;
    },
    callsByMethod(method: string) {
      return calls.filter((c) => c.method === method);
    },
    textsSent() {
      return calls.filter((c) => c.method === 'sendMessage' && typeof c.payload.text === 'string').map((c) => c.payload.text as string);
    },
    lastCall() {
      return calls[calls.length - 1];
    },
    clear() {
      calls.length = 0;
    },
  };
}
