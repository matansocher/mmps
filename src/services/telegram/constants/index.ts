import { CallbackQuery, Message } from 'node-telegram-bot-api';

export const BOTS = {
  ANNOUNCER: {
    id: 'ANNOUNCER',
    name: 'Announcer Bot 📢',
    token: 'ANNOUNCER_TELEGRAM_BOT_TOKEN',
  },
  PLAYGROUNDS: {
    id: 'PLAYGROUNDS',
    name: 'Playgrounds Bot 🃏',
    token: 'PLAYGROUNDS_TELEGRAM_BOT_TOKEN',
  },
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
  EDUCATOR: {
    id: 'EDUCATOR',
    name: 'Educator Bot 📚',
    token: 'EDUCATOR_TELEGRAM_BOT_TOKEN',
  },
  TRAINER: {
    id: 'TRAINER',
    name: 'Trainer Bot 🏋️‍♂️',
    token: 'TRAINER_TELEGRAM_BOT_TOKEN',
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
  COMMAND = 'command',
  TEXT = 'text',
  MESSAGE = 'message',
  CALLBACK_QUERY = 'callback_query',
  POLLING_ERROR = 'polling_error',
  ERROR = 'error',
}

export interface TelegramEventHandler {
  readonly event: TELEGRAM_EVENTS;
  readonly regex?: string;
  readonly handler: (payload: Message | CallbackQuery) => Promise<void> | void;
}
