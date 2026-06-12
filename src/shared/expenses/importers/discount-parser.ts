import { read, utils } from 'xlsx';
import type { Currency } from '@shared/expenses';
import { categorizeFromSectorDiscount, detectSectionCurrency, typeFromHebrewType } from './categories';
import { excelSerialToDate, type DiscountFileMeta, type ParsedRow, type ParserInput } from './types';

// Row 1 always contains a phrase like: "...לכרטיס ויזה זהב עסקי המסתיים ב-1220".
const DISCOUNT_CARD_RE = /המסתיים ב[-־]?(\d{4})/;
// Row 3 always contains a phrase like: "עסקאות לחיוב ב-10/01/2026: ...".
const DISCOUNT_CHARGE_DATE_RE = /(\d{2})\/(\d{2})\/(\d{4})/;

export function detectDiscountMeta(buffer: Buffer, fileName: string): DiscountFileMeta | null {
  const wb = read(buffer, { type: 'buffer', cellDates: false });
  if (wb.SheetNames.length === 0) return null;
  const rows = utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });

  let cardLast4: string | null = null;
  let statementYear: number | null = null;
  let statementMonth: number | null = null;

  // Scan the first ~10 rows for both markers — defensive against minor layout shifts.
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] ?? [];
    for (const cell of row) {
      if (typeof cell !== 'string') continue;
      if (!cardLast4) {
        const m = DISCOUNT_CARD_RE.exec(cell);
        if (m) cardLast4 = m[1];
      }
      if (statementYear == null) {
        const m = DISCOUNT_CHARGE_DATE_RE.exec(cell);
        if (m) {
          statementYear = Number(m[3]);
          statementMonth = Number(m[2]);
        }
      }
    }
    if (cardLast4 && statementYear != null) break;
  }

  if (!cardLast4 || statementYear == null || statementMonth == null) return null;
  return {
    kind: 'discount',
    fileName,
    cardLast4,
    statementYear,
    statementMonth,
    statementYm: `${statementYear}-${String(statementMonth).padStart(2, '0')}`,
  };
}

export function parseDiscountFile(input: ParserInput, meta: DiscountFileMeta): ParsedRow[] {
  const wb = read(input.buffer, { type: 'buffer', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });

  const parsed: ParsedRow[] = [];
  let currentCurrency: Currency = 'ILS';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const a = row[0];
    const b = row[1];
    const c = row[2];
    const e = row[4];
    const f = row[5];

    if (typeof a === 'string' && a && b == null && c == null) {
      const detected = detectSectionCurrency(a);
      if (detected) currentCurrency = detected;
      continue;
    }

    if (typeof a !== 'number' || typeof b !== 'string' || typeof c !== 'number') continue;
    if (!b.trim() || !Number.isFinite(c) || c <= 0) continue;

    const hebrewSector = typeof f === 'string' ? f.trim() : '';
    const hebrewType = typeof e === 'string' ? e.trim() : '';

    parsed.push({
      transactionDate: excelSerialToDate(a),
      vendor: b.trim(),
      amount: Math.round(c * 100) / 100,
      currency: currentCurrency,
      type: typeFromHebrewType(hebrewType),
      category: categorizeFromSectorDiscount(hebrewSector),
      hebrewSector,
      sourceRowIndex: i + 1,
      cardLast4: meta.cardLast4,
      statementYm: meta.statementYm,
    });
  }

  return parsed;
}
