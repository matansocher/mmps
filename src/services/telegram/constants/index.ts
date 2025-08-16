import { CallbackQuery, Message } from 'node-telegram-bot-api';

export const TELEGRAM_MAX_MESSAGE_LENGTH = 4095;

export enum BOT_BROADCAST_ACTIONS {
  TYPING = 'typing',
  UPLOADING_VOICE = 'upload_voice',
}

export enum POSSIBLE_INPUTS {
  TEXT = 'text',
  AUDIO = 'audio',
  VIDEO = 'video',
  PHOTO = 'photo',
  FILE = 'file',
}

export enum TELEGRAM_EVENTS {
  COMMAND = 'command',
  TEXT = 'text',
  MESSAGE = 'message',
  CALLBACK_QUERY = 'callback_query',
  LOCATION = 'location',
  EDITED_MESSAGE = 'edited_message',
  POLLING_ERROR = 'polling_error',
  ERROR = 'error',
}

export interface TelegramEventHandler {
  readonly event: TELEGRAM_EVENTS;
  readonly regex?: string;
  readonly handler: (payload: Message | CallbackQuery) => Promise<void> | void;
}

export const BLOCKED_ERROR = 'bot was blocked by the user';
