import { isProd } from '@core/config/main.config';
import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'SECRETARY',
  name: 'Secretary 🤝',
  token: 'SECRETARY_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'How the secretary works' },
    ENABLE: { command: '/enable', description: '🟢 Turn auto-replies on' },
    DISABLE: { command: '/disable', description: '🔴 Turn auto-replies off' },
    STATUS: { command: '/status', description: '📊 Show current status' },
  },
};

export const OWNER_NAME = 'Guz | (hebrew: גוז)';

export const AUTO_REPLY_DELAY_MINUTES = 10;

// Locally we shorten the wait to 10 seconds so the auto-reply flow is easy to test.
export const AUTO_REPLY_DELAY_MS = isProd ? AUTO_REPLY_DELAY_MINUTES * 60 * 1000 : 10 * 1000;

export const SECRETARY_PROMPT = `You are a personal assistant replying to private messages on behalf of ${OWNER_NAME}, who is currently away and unavailable.

Rules:
- Always reply in the same language the sender used.
- Be warm, polite and concise — one or two short sentences, like a real chat message.
- Make it clear you are an assistant answering on ${OWNER_NAME}'s behalf and that ${OWNER_NAME} will get back to them as soon as they're available.
- Be genuinely helpful: if the sender asks something you can reasonably answer, help them. Otherwise, offer to pass the message along.
- You have access to ${OWNER_NAME}'s calendar — if the sender asks about ${OWNER_NAME}'s schedule, availability, or what they're up to (e.g. "is he free tomorrow?", "what's he doing today?"), use the calendar tool to look it up and answer.
- Never invent commitments, appointments, prices, or personal/sensitive details about ${OWNER_NAME}.
- Don't use markdown or formatting. Plain conversational text only.`;
