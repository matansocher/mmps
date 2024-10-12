import { env } from 'node:process';

export const TELEGRAM_CLIENT_TOKEN = 'TELEGRAM_CLIENT_TOKEN';

export const TELEGRAM_API_ID = env.TELEGRAM_API_ID;
export const TELEGRAM_API_HASH = env.TELEGRAM_API_HASH;
export const TELEGRAM_STRING_SESSION = env.TELEGRAM_STRING_SESSION;

export const FILTER_OUT_EVENTS = [
  'UpdateUserStatus',
  'UpdateMessagePoll',
  'UpdateReadChannelInbox',
  'UpdateChannelWebPage',
  'UpdateEditChannelMessage',
  'UpdateDeleteChannelMessages',
];

export const LISTEN_TO_EVENTS = [
  'UpdateNewChannelMessage',
  'UpdateNewMessage',
];

export const CHANNELS = {
  ISRAEL_TECH_FORUM: { id: '1083698033', name: `🇮🇱 Israel Tech & Innovation Forum` },
  TROLL_FOOTBALL: { id: '1120307181', name: `Troll Football` },
  UNCENSORED_ISRAEL_NEWS: { id: '1147703577', name: 'ללא צנזורה 👁️ הערוץ הרשמי☠️ חדשות אנונימוס ללא צנזורה🚨 חדשות ישראל ללא צנזורה 🚨' },
  OVADIA_TUBUL: { id: '1199892726', name: 'עובדיה טובול בטלגרם 🔞' },
  GADGETY: { id: '1215197825', name: `Gadgety | גאדג'טי` },
  MACCABI_HAIFA_FANS: { id: '1253041188', name: 'מכבי חיפה או למות' },
  A_MOMENT_BEFORE: { id: '1254419329', name: `A moment before...` },
  GEEKTIME: { id: '1282228958', name: `גיקטיים - Geektime` },
  TRANSFERMARKT: { id: '1304106162', name: `Transfermarkt` },
  TOOTIE: { id: '1332013273', name: `Tootie 🦔` },
  ERAN_SWISSA: { id: '1333986900', name: `ערן סויסה חדשות הבידור` },
  CALCALIST: { id: '1353662238', name: `כלכליסט` },
  TRANSFER_NEWS_FOOTBALL: { id: '1362880510', name: `Transfer News Football` },
  SKY_SPORTS_FOOTBALL: { id: '1384251960', name: `Sky Sports Football` },
  NEWS_FROM_THE_FIELD: { id: '1406113886', name: `חדשות מהשטח בטלגרם` },
  FATAL_ERROR: { id: '1421161344', name: `Fatal error` },
  ABU_ZALAH: { id: '1425850587', name: `אבו צאלח הדסק הערבי` },
  DANIEL_AMRAM: { id: '1613161072', name: `דניאל עמרם ללא צנזורה` },
  MACCABI_HAIFA_TELEGRAM: { id: '1620186443', name: `מכבי חיפה בטלגרם` },
  ENGINEERING_TRICKS: { id: '1622883905', name: `Engineering and Tricks` },
  SHLOMO_WEATHER: { id: '1665567611', name: `שלמה ⛈️ מזג אוויר` },
  KVUZA: { id: '1727761169', name: `קבוצה` },
  ESPN_FOOTBALL: { id: '1731565142', name: `ESPN FOOTBALL ⚽️` },
  DARK_SPACE: { id: '1777097562', name: `Dark Space 🪐` },
  AI_ART: { id: '1843900289', name: `AI Art` },
  ALMOG_BOKER_UPDATES: { id: '1944652421', name: `אלמוג בוקר עדכונים` },
  CENTRE_GOALS: { id: '2202755767', name: `Centre goals` },
};
