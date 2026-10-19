import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'RAIL',
  name: 'Rail 🚆',
  token: 'RAIL_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: '🚆 איך משתמשים' },
  },
};

export const RAIL_LIMITS = {
  userWindowMs: 5 * 60 * 1000,
  userMaxRequests: 10,
  globalWindowMs: 60 * 60 * 1000,
  globalMaxRequests: 300,
  maxVoiceSeconds: 60,
  conversationIdleMs: 30 * 60 * 1000,
  modelCallLimitPerRun: 4,
  toolCallLimitPerRun: 3,
};

export const RAIL_AGENT_PROMPT = `You are a friendly Israel Railways assistant. Your only job is finding upcoming trains with the israel_rail tool.
- Users write (or speak, transcribed) in Hebrew or English, sometimes mixed. Station names can be in either language, with typos, slang or abbreviations (e.g. "ת״א סבידור", "נתב״ג", "Haifa Hof HaCarmel", "TLV HaHagana"). Pass the station name as the user wrote it — the tool matches Hebrew and English names.
- Every message is a train question unless clearly not. Extract origin, destination, date and time and call israel_rail. Missing date/time means now. Understand relative times in both languages ("מחר ב-8", "בעוד שעה", "tomorrow at 8", "in an hour").
- If the origin or destination is missing, ask for it briefly. Use earlier messages in the conversation for context (e.g. "and back?", "ובחזרה?", "what about tomorrow at 8?").
- Always reply in the language of the user's latest message: Hebrew for Hebrew, English for English. Keep it short and clear.
- If asked about anything unrelated to trains, say politely that you only help with train schedules.`;

export const START_MESSAGE = `היי! 🚆 אני הבוט של הרכבת.
פשוט כתבו או שלחו הודעה קולית - מאיפה ולאן, ואם צריך גם מתי - ואחזיר את הרכבות הקרובות עם תמונה של המסלול.

דוגמאות:
• סבידור לחיפה חוף הכרמל
• מחר ב-8 מבאר שבע לתל אביב השלום
• נתב״ג לירושלים נבון בעוד שעה

—

Hi! 🚆 I'm the Israel Rail bot.
Just type or send a voice message with where from, where to and (optionally) when, and I'll send the next trains with a route picture.

Examples:
• Tel Aviv Savidor to Haifa Hof HaCarmel
• Tomorrow at 8 from Beer Sheva to Tel Aviv HaShalom`;

export const MESSAGES = {
  userRateLimited: {
    he: 'רגע, יותר מדי בקשות 🙏 נסו שוב בעוד כמה דקות.',
    en: 'Too many requests 🙏 Please try again in a few minutes.',
  },
  globalRateLimited: {
    he: 'הבוט עמוס כרגע 🚦 נסו שוב בעוד קצת.',
    en: 'The bot is busy right now 🚦 Please try again a bit later.',
  },
  voiceTooLong: {
    he: 'ההודעה הקולית ארוכה מדי - נסו בקצרה, עד דקה 🎙️',
    en: 'That voice message is too long - please keep it under a minute 🎙️',
  },
  voiceNotUnderstood: {
    he: 'לא הצלחתי להבין את ההודעה הקולית, נסו שוב או כתבו לי 🙏',
    en: "I couldn't understand that voice message, please try again or type it 🙏",
  },
  noTrains: {
    he: 'לא מצאתי רכבות לחיפוש הזה 🤷',
    en: 'No trains found for this search 🤷',
  },
  error: {
    he: 'משהו השתבש, נסו שוב בעוד רגע 🙏',
    en: 'Something went wrong, please try again 🙏',
  },
} as const;
