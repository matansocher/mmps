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

// Shown by Telegram before the first /start (description, max 512 chars) and on the bot profile (short description, max 120 chars).
export const BOT_PROFILE = {
  en: {
    description: `🚆 Israel Rail trains and the Tel Aviv light rail Red Line in one message.

Tell me where from, where to and (optionally) when, by text or voice, in English or Hebrew. I'll send the next trains with departure and arrival times, platforms, transfers and delays, plus a route picture and a link to rail.co.il.

Try:
• Tel Aviv Savidor to Haifa Hof HaCarmel
• Tomorrow at 8 from Beer Sheva to Tel Aviv HaShalom
• Light rail from Allenby to Petah Tikva
• Nearest light rail station to Dizengoff Center`,
    shortDescription: '🚆 Next Israel Rail trains with platforms, transfers and a route picture. Just ask, by text or voice.',
  },
  he: {
    description: `🚆 הרכבות הקרובות - רכבת ישראל והקו האדום של הרכבת הקלה - בהודעה אחת.

כתבו או שלחו הודעה קולית - מאיפה, לאן, ואם צריך גם מתי - בעברית או באנגלית. אחזיר את הרכבות הבאות עם שעות יציאה והגעה, רציפים, החלפות ועיכובים, תמונה של המסלול וקישור לאתר רכבת ישראל.

נסו:
• סבידור לחיפה חוף הכרמל
• מחר ב-8 מבאר שבע לתל אביב השלום
• רכבת קלה מאלנבי לפתח תקווה
• מה תחנת הרכבת הקלה הקרובה לדיזנגוף סנטר?`,
    shortDescription: '🚆 הרכבות הקרובות עם רציפים, החלפות ותמונת מסלול. פשוט שואלים, בכתב או בקול.',
  },
};

export const RAIL_AGENT_PROMPT = `You are a friendly Israel trains assistant. Your only job is finding upcoming trains: Israel Railways with the israel_rail tool, and the Tel Aviv light rail Red Line (הרכבת הקלה / הקו האדום) with the light_rail tool.
- Users write (or speak, transcribed) in Hebrew or English, sometimes mixed. Station names can be in either language, with typos, slang or abbreviations (e.g. "ת״א סבידור", "נתב״ג", "Haifa Hof HaCarmel", "TLV HaHagana"). Pass the station name as the user wrote it — the tool matches Hebrew and English names.
- Every message is a train question unless clearly not. Extract origin, destination, date and time and call israel_rail, or light_rail when the user mentions the light rail / Red Line or both stations are Red Line stops. Missing date/time means now. Understand relative times in both languages ("מחר ב-8", "בעוד שעה", "tomorrow at 8", "in an hour").
- For "closest / nearest light rail station" questions or a shared location ("[מיקום ששותף: lat, lon]" / "[Shared location: lat, lon]"), call light_rail with action "nearest_station" (place, or lat/lon). If the user also wants trains from there, call light_rail departures from the nearest station afterwards.
- If the origin or destination is missing, ask for it briefly. Use earlier messages in the conversation for context (e.g. "and back?", "ובחזרה?", "what about tomorrow at 8?").
- Always reply in the language of the user's latest message: Hebrew for Hebrew, English for English. Keep it short and clear.
- If asked about anything unrelated to trains, say politely that you only help with train and light rail schedules.`;

export const START_MESSAGE = `היי! 🚆 אני הבוט של הרכבת.
פשוט כתבו או שלחו הודעה קולית - מאיפה ולאן, ואם צריך גם מתי - ואחזיר את הרכבות הקרובות עם תמונה של המסלול.

דוגמאות:
• סבידור לחיפה חוף הכרמל
• מחר ב-8 מבאר שבע לתל אביב השלום
• נתב״ג לירושלים נבון בעוד שעה
• רכבת קלה מאלנבי לפתח תקווה 🚊
• מה תחנת הרכבת הקלה הקרובה לעזריאלי?
📍 אפשר גם ללחוץ על הכפתור למטה ולשתף מיקום כדי לקבל את תחנת הרכבת הקלה הקרובה.

—

Hi! 🚆 I'm the Israel Rail bot.
Just type or send a voice message with where from, where to and (optionally) when, and I'll send the next trains with a route picture.

Examples:
• Tel Aviv Savidor to Haifa Hof HaCarmel
• Tomorrow at 8 from Beer Sheva to Tel Aviv HaShalom
• Light rail from Allenby to Petah Tikva 🚊
• Nearest light rail station to Azrieli
📍 You can also tap the button below and share your location to get the nearest light rail station.`;

export const LOCATION_BUTTON_TEXT = '📍 התחנה הקרובה אליי · Nearest station';

export const LOCATION_QUERY = {
  he: (lat: number, lon: number) => `[מיקום ששותף: ${lat}, ${lon}] מה תחנת הרכבת הקלה הקרובה אליי?`,
  en: (lat: number, lon: number) => `[Shared location: ${lat}, ${lon}] What is the nearest light rail station to me?`,
};

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
