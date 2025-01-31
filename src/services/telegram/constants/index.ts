import { Message } from 'node-telegram-bot-api';
import type { TelegramBotConfig } from '../interface';

export const BOTS: Record<string, TelegramBotConfig> = {
  WOLT: {
    id: 'WOLT',
    name: 'Wolt Bot 🍔',
    token: 'WOLT_TELEGRAM_BOT_TOKEN',
  },
  VOICE_PAL: {
    id: 'VOICE_PAL',
    name: 'Voice Pal Bot 🎧',
    token: 'VOICE_PAL_TELEGRAM_BOT_TOKEN',
  },
  COACH: {
    id: 'COACH',
    name: 'Coach Bot ⚽️',
    token: 'COACH_TELEGRAM_BOT_TOKEN',
  },
  TEACHER: {
    id: 'TEACHER',
    name: 'Teacher Bot 👨‍🏫',
    token: 'TEACHER_TELEGRAM_BOT_TOKEN',
  },
  PROGRAMMING_TEACHER: {
    id: 'PROGRAMMING_TEACHER',
    name: 'Programming Teacher Bot 👨‍🏫',
    token: 'PROGRAMMING_TEACHER_TELEGRAM_BOT_TOKEN',
  },
  ROLLINSPARK: {
    id: 'ROLLINSPARK',
    name: 'Rollins Park Bot 🏘️',
    token: 'ROLLINSPARK_TELEGRAM_BOT_TOKEN',
  },
  NOTIFIER: {
    id: 'NOTIFIER',
    name: 'Notifier Bot 🦔',
    token: 'NOTIFIER_TELEGRAM_BOT_TOKEN',
  },
};

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
  TEXT = 'text',
  MESSAGE = 'message',
  CALLBACK_QUERY = 'callback_query',
  POLLING_ERROR = 'polling_error',
  ERROR = 'error',
}

export interface TelegramBotHandler {
  readonly regex: string;
  readonly handler: (message: Message) => Promise<void>;
}
