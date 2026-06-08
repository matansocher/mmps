import { readFileSync } from 'node:fs';
import { read, utils } from 'xlsx';
import type { Currency } from '@shared/expenses';
import { categorizeFromSectorDiscount, detectSectionCurrency, typeFromHebrewType } from '../lib/categories';
import type { DiscountFileMeta } from '../lib/filename';
import { excelSerialToDate, type ParsedRow } from './types';

export function parseDiscountFile(meta: DiscountFileMeta): ParsedRow[] {
  const buf = readFileSync(meta.path);
  const wb = read(buf, { type: 'buffer', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // Array of arrays so column letters map directly: row[0]=A, row[1]=B ...
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

    // A single non-empty A cell (typical for section headers/summaries) may indicate a currency switch.
    if (typeof a === 'string' && a && b == null && c == null) {
      const detected = detectSectionCurrency(a);
      if (detected) currentCurrency = detected;
      continue;
    }

    // Transaction rows have A=date-serial (number), B=vendor (string), C=amount (number).
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
