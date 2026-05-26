import type { CallbackQuery, Chat, Message, Update, User } from 'grammy/types';

export type FakeUserOptions = {
  readonly userId?: number;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly username?: string;
  readonly languageCode?: string;
};

export type FakeChatOptions = {
  readonly chatId?: number;
  readonly type?: 'private' | 'group' | 'supergroup';
  readonly title?: string;
};

export type TextMessageOptions = {
  readonly chatId?: number;
  readonly userId?: number;
  readonly text: string;
  readonly messageId?: number;
  readonly user?: FakeUserOptions;
  readonly chat?: FakeChatOptions;
};

export type CallbackQueryOptions = {
  readonly chatId?: number;
  readonly userId?: number;
  readonly data: string;
  readonly messageId?: number;
  readonly messageText?: string;
  readonly callbackQueryId?: string;
  readonly user?: FakeUserOptions;
};

const DEFAULT_CHAT_ID = 123_456;
const DEFAULT_USER_ID = 654_321;

let updateIdCounter = 1;
let messageIdCounter = 1;
let callbackQueryIdCounter = 1;

export function resetUpdateBuilderCounters(): void {
  updateIdCounter = 1;
  messageIdCounter = 1;
  callbackQueryIdCounter = 1;
}

function buildUser(opts?: FakeUserOptions, fallbackId: number = DEFAULT_USER_ID): User {
  return {
    id: opts?.userId ?? fallbackId,
    is_bot: false,
    first_name: opts?.firstName ?? 'Test',
    last_name: opts?.lastName ?? 'User',
    username: opts?.username ?? 'testuser',
    language_code: opts?.languageCode ?? 'en',
  };
}

function buildChat(opts?: FakeChatOptions, fallbackId: number = DEFAULT_CHAT_ID): Chat {
  const type = opts?.type ?? 'private';
  if (type === 'private') {
    return {
      id: opts?.chatId ?? fallbackId,
      type: 'private',
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
    };
  }
  return {
    id: opts?.chatId ?? fallbackId,
    type,
    title: opts?.title ?? 'Test Group',
  } as Chat;
}

export function buildTextMessageUpdate(opts: TextMessageOptions): Update {
  const chatId = opts.chatId ?? opts.chat?.chatId ?? DEFAULT_CHAT_ID;
  const userId = opts.userId ?? opts.user?.userId ?? DEFAULT_USER_ID;
  const from = buildUser({ ...opts.user, userId });
  const chat = buildChat({ ...opts.chat, chatId });

  const message: Message = {
    message_id: opts.messageId ?? messageIdCounter++,
    date: Math.floor(Date.now() / 1000),
    chat,
    from,
    text: opts.text,
  } as Message;

  if (opts.text.startsWith('/')) {
    const commandLength = opts.text.split(' ')[0].length;
    (message as any).entities = [{ type: 'bot_command', offset: 0, length: commandLength }];
  }

  return {
    update_id: updateIdCounter++,
    message,
  } as Update;
}

export function buildCallbackQueryUpdate(opts: CallbackQueryOptions): Update {
  const chatId = opts.chatId ?? DEFAULT_CHAT_ID;
  const userId = opts.userId ?? opts.user?.userId ?? DEFAULT_USER_ID;
  const from = buildUser({ ...opts.user, userId });
  const chat = buildChat({ chatId });

  const sourceMessage: Message = {
    message_id: opts.messageId ?? messageIdCounter++,
    date: Math.floor(Date.now() / 1000),
    chat,
    from: { id: 1, is_bot: true, first_name: 'TestBot', username: 'test_bot' },
    text: opts.messageText ?? '',
  } as Message;

  const callbackQuery = {
    id: opts.callbackQueryId ?? String(callbackQueryIdCounter++),
    from,
    chat_instance: 'test-chat-instance',
    message: sourceMessage,
    data: opts.data,
  } as unknown as CallbackQuery;

  return {
    update_id: updateIdCounter++,
    callback_query: callbackQuery,
  };
}
