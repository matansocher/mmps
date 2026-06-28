import type { Currency, ExpenseCategory, ExpenseType } from '@shared/expenses';

export type ParsedRow = {
  readonly transactionDate: Date;
  readonly vendor: string;
  readonly amount: number;
  readonly currency: Currency;
  readonly type: ExpenseType;
  readonly category: ExpenseCategory;
  readonly hebrewSector: string;
  readonly sourceRowIndex: number;
  readonly cardLast4: string;
  readonly statementYm: string;
};

export type DiscountFileMeta = {
  readonly kind: 'discount';
  readonly fileName: string;
  readonly cardLast4: string;
  // YYYY-MM. Empty when the detector couldn't read it from the header (immediate-debit and
  // pending-only statements have no scheduled charge date); the parser fills it in from the
  // mode of transaction months.
  statementYm: string;
};

export type IsracardFileMeta = {
  readonly kind: 'isracard';
  readonly fileName: string;
  readonly cardLast4Hint: string;
  readonly statementYear: number;
};

export type FileMeta = DiscountFileMeta | IsracardFileMeta;

export type ParserInput = {
  readonly fileName: string;
  readonly buffer: Buffer;
};

export function excelSerialToDate(serial: number): Date {
  // Excel epoch (1899-12-30) → Unix epoch offset is 25569 days.
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}
