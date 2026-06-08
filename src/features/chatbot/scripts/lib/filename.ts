import { basename } from 'node:path';

// `card-<last4>-<YYYY>-<MM>.xlsx` — single card, single month (Discount/Mizrahi exports).
const DISCOUNT_RE = /^card-(\d{4})-(\d{4})-(0[1-9]|1[0-2])\.xlsx$/i;

// `card-<last4>-<YYYY>.xlsx` — full-year export, may mix multiple cards in one file
// (Isracard/Cal-style). Filename last4 is a hint only; rows carry the authoritative card.
const ISRACARD_RE = /^card-(\d{4})-(\d{4})\.xlsx$/i;

export type DiscountFileMeta = {
  readonly kind: 'discount';
  readonly path: string;
  readonly fileName: string;
  readonly cardLast4: string;
  readonly statementYear: number;
  readonly statementMonth: number; // 1–12
  readonly statementYm: string; // YYYY-MM
};

export type IsracardFileMeta = {
  readonly kind: 'isracard';
  readonly path: string;
  readonly fileName: string;
  // Filename last4 is informational only — actual card is per-row.
  readonly cardLast4Hint: string;
  readonly statementYear: number;
};

export type FileMeta = DiscountFileMeta | IsracardFileMeta;

export function parseFileMeta(filePath: string): FileMeta {
  const fileName = basename(filePath);

  const d = DISCOUNT_RE.exec(fileName);
  if (d) {
    const [, cardLast4, yearStr, monthStr] = d;
    return {
      kind: 'discount',
      path: filePath,
      fileName,
      cardLast4,
      statementYear: Number(yearStr),
      statementMonth: Number(monthStr),
      statementYm: `${yearStr}-${monthStr}`,
    };
  }

  const i = ISRACARD_RE.exec(fileName);
  if (i) {
    const [, cardLast4Hint, yearStr] = i;
    return {
      kind: 'isracard',
      path: filePath,
      fileName,
      cardLast4Hint,
      statementYear: Number(yearStr),
    };
  }

  throw new Error(
    `Filename "${fileName}" does not match any known convention. ` +
      `Expected card-<last4>-<YYYY>-<MM>.xlsx (Discount) or card-<last4>-<YYYY>.xlsx (Isracard).`,
  );
}
