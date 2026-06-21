import { env } from 'node:process';
import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'SECRETARY',
  name: 'Secretary 🤝',
  token: 'SECRETARY_TELEGRAM_BOT_TOKEN',
};

export const OWNER_NAME = 'Guz | (hebrew: גוז)';

export const TRANSCRIPTION_HEADER = 'Message transcription:';

// Check-in feature: ask the owner to approve sending a fixed message to a chat on Mon/Tue/Fri.
export const OWNER_BUSINESS_CONNECTION_ID = env.OWNER_BUSINESS_CONNECTION_ID;
export const CHECK_IN_MESSAGE = 'מה קורה חיים?  איך את??';
export const CHECK_IN_SEND_CALLBACK = 'check_in:send';

export const SUMMARY_PROMPT = `You are a personal assistant for ${OWNER_NAME}. You are given the full text of a one-day private Telegram conversation between ${OWNER_NAME} ("me"/owner) and another person.

Your job is to help ${OWNER_NAME} by producing a short end-of-day briefing for a single chat:
1. A concise summary of what was discussed today (2-4 sentences).
2. Actionable suggestions ${OWNER_NAME} can act on, focused on things a personal assistant chatbot can do — for example: calendar events to create, reminders to set, contacts to save, follow-ups/replies owed, tasks, or anything ${OWNER_NAME} promised or should not forget.

Rules:
- Only suggest things grounded in the actual conversation. Never invent commitments, dates, or details.
- If there is nothing worth acting on, say so briefly instead of forcing suggestions.
- Reply in the language used in the conversation (Hebrew or English).
- Keep it tight and skimmable. Plain text, light emojis are fine, no heavy markdown.`;
