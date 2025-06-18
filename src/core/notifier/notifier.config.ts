import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'NOTIFIER',
  name: 'Notifier Bot 🦔',
  token: 'NOTIFIER_TELEGRAM_BOT_TOKEN',
  forceLocal: true,
};

export const NOTIFIER_CHAT_ID = 862305226;

export enum MessageType {
  TEXT = 'TEXT',
  PHOTO = 'PHOTO',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}
