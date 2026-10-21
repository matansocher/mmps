import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'RAIL',
  name: 'Rail 🚆',
  token: 'RAIL_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: '🚆 איך משתמשים' },
    ACTIONS: { command: '/actions', description: '⚙️ שפה ויצירת קשר' },
    PRIVACY: { command: '/privacy', description: '🔒 פרטיות' },
  },
};

// Per-chat command menu, set when the user picks a language in /actions.
export const COMMAND_DESCRIPTIONS = {
  he: { START: '🚆 איך משתמשים', ACTIONS: '⚙️ שפה ויצירת קשר', PRIVACY: '🔒 פרטיות' },
  en: { START: '🚆 How to use', ACTIONS: '⚙️ Language & contact', PRIVACY: '🔒 Privacy' },
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

// Shown by Telegram before the first /start (description, max 512 chars) and on the bot profile (short description, max 120 chars).
export const BOT_PROFILE = {
  en: {
    description: `🚆 Israel Rail and the Tel Aviv light rail Red Line, in one chat.

Ask by text or voice: where from, where to and when. Use a station, an address or a place, search by arrival time, or share your location for the nearest stations.

You get platforms, transfers, delays, crowding and the last train home. Each result has buttons for later trains, the way back and a live train map.

Try:
• Savidor to Haifa Hof HaCarmel
• Be in Jerusalem by 9 tomorrow
• Allenby to Ben Gurion Airport`,
    shortDescription: '🚆 Israel Rail + light rail: next trains, platforms, crowding and a live train map. Just ask, by text or voice.',
  },
  he: {
    description: `🚆 רכבת ישראל והקו האדום של הרכבת הקלה, בצ'אט אחד.

כתבו או הקליטו מאיפה, לאן ומתי. אפשר תחנה, כתובת או מקום, לחפש לפי שעת הגעה, או לשלוח מיקום ולקבל את התחנות הקרובות.

תקבלו רציפים, החלפות, עיכובים, עומס ואת הרכבת האחרונה הביתה. מכל תוצאה אפשר לראות רכבות מאוחרות יותר, את הדרך חזרה ומפה חיה של הרכבת.

נסו:
• סבידור לחיפה חוף הכרמל
• להגיע לירושלים עד 9 מחר
• מאלנבי לנתב״ג`,
    shortDescription: '🚆 רכבת ישראל והרכבת הקלה: הרכבות הבאות, רציפים, עומס ומפה חיה של הרכבת. פשוט שואלים, בכתב או בקול.',
  },
};

export const RAIL_AGENT_PROMPT = `You are a friendly Israel trains assistant. Your only job is finding upcoming trains: Israel Railways with the israel_rail tool, and the Tel Aviv light rail Red Line (הרכבת הקלה / הקו האדום) with the light_rail tool.
- Users write (or speak, transcribed) in Hebrew or English, sometimes mixed. Station names can be in either language, with typos, slang or abbreviations (e.g. "ת״א סבידור", "נתב״ג", "Haifa Hof HaCarmel", "TLV HaHagana"). Pass the station name as the user wrote it — the tool matches Hebrew and English names.
- Every message is a train question unless clearly not. Extract origin, destination, date and time and call israel_rail, or light_rail when the user mentions the light rail / Red Line or both stations are Red Line stops. Missing date/time means now. If the user must arrive somewhere by a time ("להגיע עד 9", "be in Haifa by 9"), search by arrival time (timeMode "arrive"). Understand relative times in both languages ("מחר ב-8", "בעוד שעה", "tomorrow at 8", "in an hour").
- Origin and destination can also be places instead of stations: an address, landmark, mall, university, hotel or neighbourhood, or where the user is right now ("אני בקניון עזריאלי", "I'm at the Technion", "אני רוצה להגיע לכותל"). Pass them to israel_rail as fromPlace / toPlace - the tool finds the nearest train station with Google Maps and the walk to/from it. You don't get the user's live location, so if they ask "from here" / "מכאן" without saying where they are, ask where they are now (a place, address or nearby station).
- When one end is a Red Line stop that is not a train station (e.g. Allenby, Carlebach, Bloomfield) and the other is an Israel Railways station outside the Red Line area (e.g. Haifa, Jerusalem, the airport), call rail_trip - it plans one trip combining the Red Line, the walk at the interchange and the train, in either direction.
- For "closest / nearest train station" questions, call israel_rail with action "nearest_station" (place). For "closest / nearest light rail station" questions, call light_rail with action "nearest_station" (place). If the user also wants trains from there, call light_rail departures from the nearest station afterwards.
- Use web_search only for train-related info the rail tools don't have: strikes, service disruptions or line closures, planned works, new or temporarily closed stations, station facilities (parking, accessibility, opening hours), fares and Rav-Kav, or to identify a place the user named so you can pass a clearer fromPlace / toPlace. Search in the user's language and include "רכבת ישראל" / "Israel Railways" in the query. Never use it for train times - always use israel_rail / light_rail for those. Cite the 1-2 most relevant sources as markdown links.
- If the origin or destination is missing, ask for it briefly. Use earlier messages in the conversation for context (e.g. "and back?", "ובחזרה?", "what about tomorrow at 8?").
- Always reply in the language of the user's latest message: Hebrew for Hebrew, English for English. Keep it short and clear.
- If asked about anything unrelated to trains, say politely that you only help with trains and the light rail - don't web search it.`;

// Short /start reply for users who already finished or skipped onboarding.
export const START_MESSAGE = {
  he: `היי! 🚆 כתבו או שלחו הודעה קולית - מאיפה, לאן ואם צריך גם מתי.
למשל: מחר ב-8 מסבידור לחיפה חוף הכרמל
📍 שלחו מיקום ואמצא את התחנות הקרובות
⚙️ /actions - שפה ויצירת קשר
🔒 /privacy - פרטיות`,
  en: `Hi! 🚆 Type or send a voice message with where from, where to and (optionally) when.
For example: Tomorrow at 8 from Tel Aviv Savidor to Haifa Hof HaCarmel
📍 Share your location and I'll find the nearest stations
⚙️ /actions - Language & contact
🔒 /privacy - Privacy`,
} as const;

export const ONBOARDING_SAMPLE_ROUTE = { fromStationId: 3700, toStationId: 2300 } as const;

export const ONBOARDING_MESSAGES = {
  language: `היי! 🚆 אני הבוט של הרכבת. באיזו שפה נדבר?
Hi! 🚆 I'm the Israel Rail bot. Which language do you prefer?`,
  features: {
    he: `(2/3) הנה מה שאני יודע לעשות:
🚆 רכבת ישראל - הרכבות הבאות, רציפים ועיכובים, גם לפי שעת הגעה
🚊 הרכבת הקלה - הקו האדום, גם בשילוב עם רכבת ישראל
📍 מקומות - כתובת או מיקום ששלחתם, ואמצא את התחנה הקרובה
🎙️ הודעות קוליות - פשוט תגידו מאיפה ולאן`,
    en: `(2/3) Here's what I can do:
🚆 Israel Rail - next trains, platforms and delays, also by arrival time
🚊 Light rail - the Tel Aviv Red Line, also combined with Israel Rail
📍 Places - an address or a shared location, and I'll find the nearest station
🎙️ Voice messages - just say where from and where to`,
  },
  tryIt: {
    he: `(3/3) בואו ננסה! לחצו על הכפתור לרכבות הקרובות מסבידור לחיפה חוף הכרמל.
בתשובה יש כפתורים לרכבות מאוחרות יותר, לכיוון ההפוך ולמיקום הרכבת 🚀`,
    en: `(3/3) Let's try it! Tap the button for the next trains from Tel Aviv Savidor to Haifa Hof HaCarmel.
The result has buttons for later trains, the way back and where your train is 🚀`,
  },
  buttons: {
    he: { next: 'המשך ➡️', skip: 'דילוג ⏭', tryIt: '🚆 סבידור ← חיפה חוף הכרמל' },
    en: { next: 'Next ➡️', skip: 'Skip ⏭', tryIt: '🚆 Savidor → Haifa Hof HaCarmel' },
  },
  languageButtons: { he: 'עברית 🇮🇱', en: 'English 🇬🇧' },
} as const;

export const MESSAGES = {
  privacy: {
    he: `🔒 פרטיות
• אני שומר את השם והמשתמש שלכם בטלגרם, את השפה שבחרתם ואת שלב ההיכרות, כדי לזכור את ההגדרות שלכם.
• ההודעות, ההקלטות והמיקומים מעובדים ב-OpenAI (כדי להבין אותם) וב-Google Maps (כדי למצוא מקומות ומסלולי הליכה). זמני הרכבות מגיעים מרכבת ישראל וממשרד התחבורה.
• השיחה נשמרת עד 30 דקות בלי פעילות ואז נמחקת. מיקומים לא נשמרים.
• המפתח רואה שאלות ותשובות, כדי לתקן באגים ולשפר את הבוט.
• רוצים שהמידע שלכם יימחק? כתבו דרך /actions ← יצירת קשר.`,
    en: `🔒 Privacy
• I save your Telegram name, username, chosen language and onboarding progress, so I remember your settings.
• Your messages, voice notes and locations are processed by OpenAI (to understand them) and Google Maps (to find places and walking routes). Train times come from Israel Railways and the Ministry of Transport.
• The conversation is kept for 30 minutes of inactivity and then deleted. Locations aren't saved.
• The developer can see questions and answers, to fix bugs and improve the bot.
• Want your data deleted? Write via /actions → Contact.`,
  },
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
