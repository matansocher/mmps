import { read, utils } from 'xlsx';
import { Logger } from '@core/utils';
import { categorizeVendor, type Currency, type ExpenseCategory, type ExpenseType } from '@shared/expenses';
import type { IsracardFileMeta, ParsedRow, ParserInput } from './types';

const logger = new Logger('isracard-parser');

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
const DEFAULT_TYPE: ExpenseType = 'card_alert';

// Some Isracard exports embed the year in the title row (e.g. "...לשנת 2026").
const ISRACARD_YEAR_RE = /(20\d{2})/;
// Card hint may appear in title (e.g. "...כרטיס המסתיים ב-5713").
const ISRACARD_CARD_RE = /(\d{4})/;

export function detectIsracardMeta(buffer: Buffer, fileName: string): IsracardFileMeta | null {
  const wb = read(buffer, { type: 'buffer', cellDates: false });
  if (wb.SheetNames.length === 0) return null;
  // Must contain at least one sheet whose first ~50 rows include the Isracard header marker.
  let found = false;
  let yearHint: number | null = null;
  let cardHint: string = '0000';
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
    for (let i = 0; i < Math.min(50, rows.length); i++) {
      const row = rows[i] ?? [];
      for (const cell of row) {
        if (typeof cell !== 'string') continue;
        if (cell.includes(HEADER_MARKER)) found = true;
        if (yearHint == null) {
          const m = ISRACARD_YEAR_RE.exec(cell);
          if (m) yearHint = Number(m[1]);
        }
        if (cardHint === '0000') {
          const m = ISRACARD_CARD_RE.exec(cell);
          if (m && !ISRACARD_YEAR_RE.test(m[1])) cardHint = m[1];
        }
      }
      if (found && yearHint != null) break;
    }
    if (found) break;
  }
  if (!found) return null;
  return {
    kind: 'isracard',
    fileName,
    cardLast4Hint: cardHint,
    statementYear: yearHint ?? new Date().getFullYear(),
  };
}

function parseDdMmYyyy(s: string): Date | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0));
}

function statementYmFromBillingDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function parseIsracardFile(input: ParserInput, meta: IsracardFileMeta): Promise<ParsedRow[]> {
  const wb = read(input.buffer, { type: 'buffer', cellDates: false });
  const out: ParsedRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });

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
