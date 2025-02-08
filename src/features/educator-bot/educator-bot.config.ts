import { BotCommand } from 'node-telegram-bot-api';

export const TOPIC_START_HOUR_OF_DAY = 18;

export const EDUCATOR_BOT_COMMANDS: Record<string, BotCommand> = {
  START: { command: '/start', description: 'Start learning daily' },
  STOP: { command: '/stop', description: 'Stop learning daily' },
  TOPIC: { command: '/topic', description: 'Start the next topic' },
  ADD: { command: '/add', description: 'Add a new topic' },
};

export enum BOT_ACTIONS {
  COMPLETE = 'complete',
}

export const EDUCATOR_ASSISTANT_ID = 'asst_2uMH7TYQkUwbwxWlp5f7L6NY';
