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
  // Per-row card last4 + statement YM. Both formats supply these so the messageId
  // builder can stay parser-agnostic. The discount parser fills them from the
  // file metadata (one card / one month per file). The isracard parser fills them
  // per-row from column D + the row's billing date.
  readonly cardLast4: string;
  readonly statementYm: string;
};

export function excelSerialToDate(serial: number): Date {
  // Excel epoch (1899-12-30) → Unix epoch offset is 25569 days.
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}
