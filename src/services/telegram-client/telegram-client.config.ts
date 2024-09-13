import { env } from 'node:process';

export const TELEGRAM_CLIENT_TOKEN = 'TELEGRAM_CLIENT_TOKEN';

export const TELEGRAM_API_ID = env.TELEGRAM_API_ID;
export const TELEGRAM_API_HASH = env.TELEGRAM_API_HASH;
export const TELEGRAM_STRING_SESSION = env.TELEGRAM_STRING_SESSION;

export const CHANNELS = [
  { id: '1338974728', name: 'ללא צנזורה 👁️ הערוץ הרשמי' },
  { id: '1465878333', name: '☠️ חדשות אנונימוס ללא צנזורה ☠️' },
  { id: '1147703577', name: 'ללא צנזורה 👁️ הערוץ הרשמי☠️ חדשות אנונימוס ללא צנזורה🚨 חדשות ישראל ללא צנזורה 🚨' },
  { id: '1406113886', name: 'חדשות מהשטח בטלגרם' },
  { id: '1613161072', name: 'דניאל עמרם ללא צנזורה' },
  { id: '1620186443', name: 'מכבי חיפה בטלגרם' },
  { id: '1253041188', name: 'מכבי חיפה או למות' },
  { id: '1353662238', name: 'כלכליסט' },
  { id: '1944652421', name: 'אלמוג בוקר עדכונים' },
  { id: '1199892726', name: 'עובדיה טובול בטלגרם 🔞' },
  { id: '1425850587', name: 'אבו צאלח הדסק הערבי' },
];
