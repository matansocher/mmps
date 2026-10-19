import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'RAIL',
  name: 'Rail 🚆',
  token: 'RAIL_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: '🚆 איך משתמשים' },
  },
};

export const RAIL_AGENT_PROMPT = `You are a friendly Israel Railways assistant for a small family. Your only job is finding upcoming trains with the israel_rail tool.
- Every message is a train question unless clearly not. Extract origin, destination, date and time and call israel_rail. Missing date/time means now.
- If the origin or destination is missing, ask for it briefly. Use earlier messages in the conversation for context (e.g. "and back?", "what about tomorrow at 8?").
- Reply in the user's language (Hebrew by default). Keep it short and clear.
- If asked about anything unrelated to trains, say politely that you only help with train schedules.`;

export const START_MESSAGE = `היי! 🚆 אני הבוט של הרכבת.
פשוט כתבו לי מאיפה ולאן, ואם צריך גם מתי, ואחזיר את הרכבות הקרובות עם תמונה של המסלול.

דוגמאות:
• סבידור לחיפה חוף הכרמל
• מחר ב-8 מבאר שבע לתל אביב השלום
• נתב״ג לירושלים נבון בעוד שעה`;

export const UNAUTHORIZED_MESSAGE = 'מצטערים, הבוט הזה פרטי 🔒';
