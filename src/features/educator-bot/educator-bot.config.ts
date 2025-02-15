import { BotCommand } from 'node-telegram-bot-api';

export const TOPIC_START_HOUR_OF_DAY = 18;
export const IDLE_DAYS_REMINDER = 3;

export const CUSTOM_ERROR_MESSAGE = `וואלה מצטערת, אבל משהו רע קרה. אפשר לנסות שוב מאוחר יותר`;

export const EDUCATOR_BOT_COMMANDS: Record<string, BotCommand> = {
  START: { command: '/start', description: 'רוצה להתחיל ללמוד' },
  STOP: { command: '/stop', description: 'רוצה להפסיק ללמוד' },
  TOPIC: { command: '/topic', description: 'נושא הבא' },
  CUSTOM: { command: '/custom', description: 'נושא ספציפי' },
  ADD: { command: '/add', description: 'הוספת נושא' },
};

export enum BOT_ACTIONS {
  COMPLETE = 'complete',
}

export const EDUCATOR_ASSISTANT_ID = 'asst_2uMH7TYQkUwbwxWlp5f7L6NY';
