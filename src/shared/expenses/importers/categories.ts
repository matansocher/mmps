// Hebrew → category/type heuristics (avoid an LLM round-trip when sector is recognised).

import type { Currency, ExpenseCategory, ExpenseType } from '@shared/expenses';

export const SECTOR_TO_CATEGORY_DISCOUNT: Record<string, ExpenseCategory> = {
  מסעדות: 'restaurants',
  'מזון מהיר': 'fast_food',
  'מזון ומשקאות': 'groceries',
  אנרגיה: 'fuel',
  'רכב ותחבורה': 'transport',
  'ריהוט ובית': 'home',
  'תעשיה ומכירות': 'shopping',
  'אופנה והלבשה': 'shopping',
  'רפואה ובריאות': 'health',
  'בריאות ויופי': 'health',
  'פנאי בילוי': 'entertainment',
  'תרבות ופנאי': 'entertainment',
  אירועים: 'events',
  'מלונאות ואירוח': 'travel',
  תיירות: 'travel',
  'תקשורת ומחשבים': 'communications',
  'ביטוח ופיננסים': 'insurance',
  מוסדות: 'government',
  חינוך: 'other',
  שונות: 'other',
};

export const TYPE_KEYWORDS: ReadonlyArray<{ readonly hebrew: string; readonly type: ExpenseType }> = [{ hebrew: 'הוראת קבע', type: 'bill' }];

export const SECTION_CURRENCY_KEYWORDS: ReadonlyArray<{ readonly match: RegExp; readonly currency: Currency }> = [
  { match: /דולר|\$/, currency: 'USD' },
  { match: /אירו|€/, currency: 'EUR' },
  { match: /פאונד|לירה שטרלינג|£/, currency: 'GBP' },
  { match: /יין יפני|¥/, currency: 'JPY' },
];

export function categorizeFromSectorDiscount(sector: string): ExpenseCategory {
  if (sector && SECTOR_TO_CATEGORY_DISCOUNT[sector]) return SECTOR_TO_CATEGORY_DISCOUNT[sector];
  return 'other';
}

export function typeFromHebrewType(hebrewType: string): ExpenseType {
  for (const { hebrew, type } of TYPE_KEYWORDS) if (hebrewType.includes(hebrew)) return type;
  return 'card_alert';
}

export function detectSectionCurrency(text: string): Currency | null {
  for (const { match, currency } of SECTION_CURRENCY_KEYWORDS) {
    if (match.test(text)) return currency;
  }
  return null;
}
