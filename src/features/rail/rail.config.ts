import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'RAIL',
  name: 'Rail 🚆',
  token: 'RAIL_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: '🚆 איך משתמשים' },
    ACTIONS: { command: '/actions', description: '⚙️ שפה ויצירת קשר' },
  },
};

// Per-chat command menu, set when the user picks a language in /actions.
export const COMMAND_DESCRIPTIONS = {
  he: { START: '🚆 איך משתמשים', ACTIONS: '⚙️ שפה ויצירת קשר' },
  en: { START: '🚆 How to use', ACTIONS: '⚙️ Language & contact' },
} as const;

export const ACTIONS_CALLBACK_PREFIX = 'actions';

export const CONTACT_MESSAGE_TTL_MS = 10 * 60 * 1000;

export const RAIL_LIMITS = {
  userWindowMs: 5 * 60 * 1000,
  userMaxRequests: 10,
  globalWindowMs: 60 * 60 * 1000,
  globalMaxRequests: 300,
  maxVoiceSeconds: 60,
  conversationIdleMs: 30 * 60 * 1000,
  modelCallLimitPerRun: 5,
  toolCallLimitPerRun: 4,
  webSearchCallLimitPerRun: 1,
};

export const WAKE_ALERT_CONFIG = {
  minutesBeforeArrival: 5,
  // Live delays are re-checked only for alerts due within this window, at most once per interval.
  recheckWindowMinutes: 15,
  recheckIntervalMinutes: 2,
  maxTrainChoices: 5,
};

// Shown by Telegram before the first /start (description, max 512 chars) and on the bot profile (short description, max 120 chars).
export const BOT_PROFILE = {
  en: {
    description: `🚆 Israel Rail trains and the Tel Aviv light rail Red Line in one message.

Tell me where from, where to (station or any place) and when, by text or voice, in English or Hebrew. I'll send the next trains with departure and arrival times, platforms, transfers and delays, plus a route picture and a link to rail.co.il.

Try:
• Tel Aviv Savidor to Haifa Hof HaCarmel
• Tomorrow at 8 from Beer Sheva to Tel Aviv HaShalom
• Light rail from Allenby to Petah Tikva
• Dizengoff Center to the Grand Canyon mall in Haifa`,
    shortDescription: '🚆 Next Israel Rail trains with platforms, transfers and a route picture. Just ask, by text or voice.',
  },
  he: {
    description: `🚆 הרכבת הבאה ברכבת ישראל ובקו האדום של הרכבת הקלה, בהודעה אחת.

כתבו או הקליטו מאיפה, לאן ומתי. אפשר תחנה, כתובת או מקום.
תקבלו שעות, רציפים, החלפות ועיכובים, עם תמונת מסלול.

נסו:
• סבידור לחיפה חוף הכרמל
• מחר ב-8 מבאר שבע לתל אביב
• רכבת קלה מאלנבי לפתח תקווה`,
    shortDescription: '🚆 הרכבת הבאה ברכבת ישראל וברכבת הקלה, עם רציפים, החלפות ומפת מסלול. פשוט שואלים, בכתב או בקול.',
  },
};

export const RAIL_AGENT_PROMPT = `You are a friendly Israel trains assistant. Your only job is finding upcoming trains: Israel Railways with the israel_rail tool, and the Tel Aviv light rail Red Line (הרכבת הקלה / הקו האדום) with the light_rail tool.
- Users write (or speak, transcribed) in Hebrew or English, sometimes mixed. Station names can be in either language, with typos, slang or abbreviations (e.g. "ת״א סבידור", "נתב״ג", "Haifa Hof HaCarmel", "TLV HaHagana"). Pass the station name as the user wrote it — the tool matches Hebrew and English names.
- Every message is a train question unless clearly not. Extract origin, destination, date and time and call israel_rail, or light_rail when the user mentions the light rail / Red Line or both stations are Red Line stops. Missing date/time means now. If the user must arrive somewhere by a time ("להגיע עד 9", "be in Haifa by 9"), search by arrival time (timeMode "arrive"). Understand relative times in both languages ("מחר ב-8", "בעוד שעה", "tomorrow at 8", "in an hour").
- Origin and destination can also be places instead of stations: an address, landmark, mall, university, hotel or neighbourhood, or where the user is right now ("אני בקניון עזריאלי", "I'm at the Technion", "אני רוצה להגיע לכותל"). Pass them to israel_rail as fromPlace / toPlace - the tool finds the nearest train station with Google Maps and the walk to/from it. You don't get the user's live location, so if they ask "from here" / "מכאן" without saying where they are, ask where they are now (a place, address or nearby station).
- For "closest / nearest train station" questions, call israel_rail with action "nearest_station" (place). For "closest / nearest light rail station" questions, call light_rail with action "nearest_station" (place). If the user also wants trains from there, call light_rail departures from the nearest station afterwards.
- Use web_search only for train-related info the rail tools don't have: strikes, service disruptions or line closures, planned works, new or temporarily closed stations, station facilities (parking, accessibility, opening hours), fares and Rav-Kav, or to identify a place the user named so you can pass a clearer fromPlace / toPlace. Search in the user's language and include "רכבת ישראל" / "Israel Railways" in the query. Never use it for train times - always use israel_rail / light_rail for those. Cite the 1-2 most relevant sources as markdown links.
- If the origin or destination is missing, ask for it briefly. Use earlier messages in the conversation for context (e.g. "and back?", "ובחזרה?", "what about tomorrow at 8?").
- Always reply in the language of the user's latest message: Hebrew for Hebrew, English for English. Keep it short and clear.
- If asked about anything unrelated to trains, say politely that you only help with trains and the light rail - don't web search it.`;

export const START_MESSAGE = `היי! 🚆 אני הבוט של הרכבת.
פשוט כתבו או שלחו הודעה קולית - מאיפה ולאן, ואם צריך גם מתי - ואחזיר את הרכבות הקרובות עם תמונה של המסלול.

דוגמאות:
• סבידור לחיפה חוף הכרמל
• מחר ב-8 מבאר שבע לתל אביב השלום
• נתב״ג לירושלים נבון בעוד שעה
• רכבת קלה מאלנבי לפתח תקווה 🚊
• מה תחנת הרכבת הקלה הקרובה לעזריאלי?
• אני בדיזנגוף סנטר ורוצה להגיע לגרנד קניון בחיפה 📍
• מה תחנת הרכבת הכי קרובה לטכניון?

—

Hi! 🚆 I'm the Israel Rail bot.
Just type or send a voice message with where from, where to and (optionally) when, and I'll send the next trains with a route picture.

Examples:
• Tel Aviv Savidor to Haifa Hof HaCarmel
• Tomorrow at 8 from Beer Sheva to Tel Aviv HaShalom
• Light rail from Allenby to Petah Tikva 🚊
• Nearest light rail station to Azrieli
• I'm at Dizengoff Center, how do I get to the Grand Canyon mall in Haifa? 📍
• Nearest train station to the Technion

⚙️ /actions - שפה ויצירת קשר · Language & contact`;

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
  trainNotFound: {
    he: 'לא מצאתי את הרכבת הזו יותר, נסו לחפש שוב 🤷',
    en: "I couldn't find that train anymore, please search again 🤷",
  },
  locationFailed: {
    he: 'לא הצלחתי למצוא תחנות ליד המיקום הזה, נסו שוב בעוד רגע 🙏',
    en: "I couldn't look up stations near this location, please try again 🙏",
  },
  refreshTrainMap: {
    he: '🔄 רענון',
    en: '🔄 Refresh',
  },
  error: {
    he: 'משהו השתבש, נסו שוב בעוד רגע 🙏',
    en: 'Something went wrong, please try again 🙏',
  },
  wakePickTrain: {
    he: '⏰ על איזו רכבת אתם? אעיר אתכם 5 דקות לפני ההגעה.',
    en: "⏰ Which train are you on? I'll wake you 5 minutes before you arrive.",
  },
  wakeTooLate: {
    he: 'הרכבת הזו מגיעה בעוד פחות מ-5 דקות - כבר הזמן לקום 🙂',
    en: 'This train arrives in less than 5 minutes - time to get up already 🙂',
  },
  wakeTrainNotFound: {
    he: 'לא מצאתי את הרכבת הזו יותר, נסו לחפש שוב 🤷',
    en: "I couldn't find this train anymore, please search again 🤷",
  },
  wakeCancelled: {
    he: '🔕 ההתראה בוטלה.',
    en: '🔕 Alert cancelled.',
  },
  wakeAlreadyHandled: {
    he: 'ההתראה הזו כבר לא פעילה.',
    en: 'This alert is no longer active.',
  },
  actionsTitle: {
    he: '⚙️ מה תרצו לעשות?',
    en: '⚙️ What would you like to do?',
  },
  switchLanguage: {
    he: '🇬🇧 Switch to English',
    en: '🇮🇱 החלפה לעברית',
  },
  languageSaved: {
    he: 'מעכשיו אענה בעברית 🇮🇱',
    en: "I'll reply in English from now on 🇬🇧",
  },
  contactMessageButton: {
    he: '✉️ שליחת הודעה למפתח',
    en: '✉️ Send a message to the developer',
  },
  contactChatButton: {
    he: '💬 צ׳אט ישיר עם המפתח',
    en: '💬 Chat with the developer',
  },
  contactPrompt: {
    he: 'כתבו לי את ההודעה שלכם - הצעה, באג או כל דבר אחר - והיא תועבר למפתח ✍️',
    en: 'Write your message - a suggestion, a bug or anything else - and I will pass it on to the developer ✍️',
  },
  contactCancelButton: {
    he: '✖️ ביטול',
    en: '✖️ Cancel',
  },
  contactCancelled: {
    he: 'בוטל 👍',
    en: 'Cancelled 👍',
  },
  contactSent: {
    he: 'תודה! ההודעה הועברה למפתח 🙏',
    en: 'Thanks! Your message was sent to the developer 🙏',
  },
} as const;
