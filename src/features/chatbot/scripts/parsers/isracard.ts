import { readFileSync } from 'node:fs';
import { read, utils } from 'xlsx';
import { Logger } from '@core/utils';
import { categorizeVendor, type Currency, type ExpenseCategory, type ExpenseType } from '@shared/expenses';
import type { IsracardFileMeta } from '../lib/filename';
import type { ParsedRow } from './types';

const logger = new Logger('isracard-parser');

// Authoritative when we can; AI fallback for anything new. These keys come from observed
// Isracard exports — extend in-place when the bank ships a new sector.
const SECTOR_TO_CATEGORY_ISRACARD: Record<string, ExpenseCategory> = {
  'מסעדות, קפה וברים': 'restaurants',
  'פנאי, בידור וספורט': 'entertainment',
  'תחבורה ורכבים': 'transport',
  'עירייה וממשלה': 'government',
  'רפואה ובתי מרקחת': 'health',
  'חשמל ומחשבים': 'electronics',
  'ספרים ודפוס': 'books',
  'העברת כספים': 'transfer',
};

const CURRENCY_BY_SYMBOL: Record<string, Currency> = {
  '₪': 'ILS',
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
};

const HEADER_MARKER = 'שם בית העסק';
const STOP_MARKER = 'סך הכל';
// "חיוב עסקות מיידי" = immediate-charge FX line; "רגילה" = regular ILS row.
// Neither maps to "bill" / "receipt" semantically — they're all card charges, so route
// everything to `card_alert` (matches the Discount parser default).
const DEFAULT_TYPE: ExpenseType = 'card_alert';

function parseDdMmYyyy(s: string): Date | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  // Construct in UTC at noon so timezone math (Asia/Jerusalem) doesn't shift the calendar day.
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0));
}

function statementYmFromBillingDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function parseIsracardFile(meta: IsracardFileMeta): Promise<ParsedRow[]> {
  const buf = readFileSync(meta.path);
  const wb = read(buf, { type: 'buffer', cellDates: false });
  const out: ParsedRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });

    // Locate header row (the one containing "שם בית העסק"); data starts after it.
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? [];
      if (row.some((c) => typeof c === 'string' && c.includes(HEADER_MARKER))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) {
      logger.warn(`${meta.fileName} sheet "${sheetName}": header row not found, skipping sheet`);
      continue;
    }

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] ?? [];

      // Trailer / blank rows mark end of data block.
      const firstCell = row[0];
      if (typeof firstCell === 'string' && firstCell.startsWith(STOP_MARKER)) break;
      if (row.every((c) => c == null || c === '')) continue;

      const dateStr = typeof firstCell === 'string' ? firstCell : null;
      const vendorRaw = typeof row[1] === 'string' ? row[1].trim() : '';
      const hebrewSector = typeof row[2] === 'string' ? row[2].trim() : '';
      const cardCell = row[3];
      const cardLast4 = typeof cardCell === 'string' ? cardCell.trim() : typeof cardCell === 'number' ? String(cardCell) : '';
      const billedAmount = typeof row[5] === 'number' ? row[5] : null;
      const originalAmount = typeof row[7] === 'number' ? row[7] : null;
      const originalCurrencySymbol = typeof row[8] === 'string' ? row[8].trim() : '';
      const billingDateStr = typeof row[9] === 'string' ? row[9] : null;

      if (!dateStr || !vendorRaw || billedAmount == null || !cardLast4 || !billingDateStr) continue;

      const transactionDate = parseDdMmYyyy(dateStr);
      const billingDate = parseDdMmYyyy(billingDateStr);
      if (!transactionDate || !billingDate) {
        logger.warn(`${meta.fileName} row ${i + 1}: unparsable date(s) "${dateStr}" / "${billingDateStr}", skipping`);
        continue;
      }

      // FX rows: if the original currency isn't ILS, prefer the original amount + currency so
      // that "20 USD" stays "20 USD" rather than being collapsed to the bank's ILS conversion.
      // Refunds (negative amounts) are accepted as-is — the analytics layer treats them as offsets.
      let amount: number;
      let currency: Currency;
      const originalCurrency = CURRENCY_BY_SYMBOL[originalCurrencySymbol];
      if (originalCurrency && originalCurrency !== 'ILS' && originalAmount != null) {
        amount = originalAmount;
        currency = originalCurrency;
      } else {
        amount = billedAmount;
        currency = 'ILS';
      }
      amount = Math.round(amount * 100) / 100;

      if (cardLast4 !== meta.cardLast4Hint) {
        // Filename hint mismatch — accept row but flag. Multi-card files (e.g. 5713 file
        // also containing 5216 rows) are legitimate; the row's column-D card wins.
        logger.log(`${meta.fileName} row ${i + 1}: card mismatch (filename hint=${meta.cardLast4Hint}, row=${cardLast4})`);
      }

      let category: ExpenseCategory;
      if (hebrewSector && SECTOR_TO_CATEGORY_ISRACARD[hebrewSector]) {
        category = SECTOR_TO_CATEGORY_ISRACARD[hebrewSector];
      } else {
        const guess = await categorizeVendor({ vendor: vendorRaw, amount, currency });
        category = guess.category;
        logger.log(`${meta.fileName} row ${i + 1}: unknown sector "${hebrewSector}" → AI guessed "${category}" for "${vendorRaw}"`);
      }

      out.push({
        transactionDate,
        vendor: vendorRaw,
        amount,
        currency,
        type: DEFAULT_TYPE,
        category,
        hebrewSector,
        sourceRowIndex: i + 1,
        cardLast4,
        statementYm: statementYmFromBillingDate(billingDate),
      });
    }
  }

  return out;
}
