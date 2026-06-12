// Reusable importer pipeline — used by both the standalone script and the expenses bot's
// document-upload handler. Caller supplies parsed rows; we handle dedup + override-inheritance
// + insertion. Pure of any file-system / Telegram concerns.

import {
  createExpense,
  type CreateExpenseData,
  effectiveVendor,
  type Expense,
  getAllOverriddenExpenses,
  getExpensesBetween,
} from '@shared/expenses';
import { findDuplicate, normalizeName } from './dedup';
import { buildOverrideMap, findOverride, type OverrideEntry, registerOverride } from './override-map';
import { parseDiscountFile } from './discount-parser';
import { parseIsracardFile } from './isracard-parser';
import type { FileMeta, ParsedRow, ParserInput } from './types';

export type AiCategorizedRow = {
  readonly vendor: string;
  readonly category: string;
};

export type AmbiguousRow = {
  readonly fileName: string;
  readonly sourceRowIndex: number;
  readonly transactionDate: Date;
  readonly amount: number;
  readonly currency: string;
  readonly vendor: string;
  readonly candidateVendors: ReadonlyArray<string>;
};

export type FileImportSummary = {
  readonly fileName: string;
  readonly meta: FileMeta;
  readonly parsedRows: number;
  readonly inserted: number;
  readonly skipped: number;
  readonly ambiguous: number;
  readonly inherited: number;
  readonly aiCategorized: ReadonlyArray<AiCategorizedRow>;
  readonly ambiguousRows: ReadonlyArray<AmbiguousRow>;
};

export type ImportSummary = {
  readonly files: ReadonlyArray<FileImportSummary>;
  readonly inserted: number;
  readonly skipped: number;
  readonly ambiguous: number;
  readonly inherited: number;
};

export type ImportOptions = {
  readonly dryRun?: boolean;
};

function buildMessageId(row: ParsedRow): string {
  const dateKey = row.transactionDate.toISOString().slice(0, 10);
  const amountKey = Math.round(row.amount * 100);
  const vendorKey = normalizeName(row.vendor).slice(0, 24) || 'unknown';
  return `card-xlsx:${row.cardLast4}:${row.statementYm}:${dateKey}:${row.currency}:${amountKey}:${vendorKey}`;
}

function toCreateData(row: ParsedRow, override: OverrideEntry | null): CreateExpenseData {
  const data: CreateExpenseData = {
    messageId: buildMessageId(row),
    vendor: row.vendor,
    category: row.category,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    card: row.cardLast4,
    transactionDate: row.transactionDate,
  };
  if (!override) return data;
  return {
    ...data,
    ...(override.userVendor ? { userVendor: override.userVendor } : {}),
    ...(override.userCategory ? { userCategory: override.userCategory } : {}),
  };
}

export async function parseInput(input: ParserInput, meta: FileMeta): Promise<ParsedRow[]> {
  if (meta.kind === 'discount') return parseDiscountFile(input, meta);
  return parseIsracardFile(input, meta);
}

export async function importParsedFiles(
  parsedFiles: ReadonlyArray<{ readonly meta: FileMeta; readonly rows: ReadonlyArray<ParsedRow> }>,
  options: ImportOptions = {},
): Promise<ImportSummary> {
  const { dryRun = false } = options;
  const everyRow = parsedFiles.flatMap((b) => [...b.rows]);
  if (everyRow.length === 0) {
    return { files: [], inserted: 0, skipped: 0, ambiguous: 0, inherited: 0 };
  }

  const minDate = new Date(Math.min(...everyRow.map((r) => r.transactionDate.getTime())));
  const maxDate = new Date(Math.max(...everyRow.map((r) => r.transactionDate.getTime())));
  const poolFrom = new Date(minDate.getTime() - 24 * 60 * 60 * 1000);
  const poolTo = new Date(maxDate.getTime() + 2 * 24 * 60 * 60 * 1000);

  const [existing, overridden] = await Promise.all([getExpensesBetween(poolFrom, poolTo), getAllOverriddenExpenses()]);

  const liveExisting: Expense[] = [...existing];
  const existingMessageIds = new Set(liveExisting.map((e) => e.messageId));
  const overrideMap = buildOverrideMap(overridden);

  const fileSummaries: FileImportSummary[] = [];

  for (const { meta, rows } of parsedFiles) {
    const aiCategorized: AiCategorizedRow[] = [];
    const ambiguousRows: AmbiguousRow[] = [];
    let inserted = 0;
    let skipped = 0;
    let ambiguous = 0;
    let inherited = 0;

    for (const row of rows) {
      // Track AI-categorized rows for reporting (sector wasn't in the heuristic map → fell back to AI).
      if (!row.hebrewSector) aiCategorized.push({ vendor: row.vendor, category: row.category });

      const override = findOverride(row.vendor, overrideMap);
      const data = toCreateData(row, override);

      if (existingMessageIds.has(data.messageId)) {
        skipped++;
        continue;
      }

      const dup = findDuplicate(row, liveExisting);
      if (dup.kind === 'duplicate') {
        skipped++;
        continue;
      }
      if (dup.kind === 'ambiguous') {
        ambiguous++;
        ambiguousRows.push({
          fileName: meta.fileName,
          sourceRowIndex: row.sourceRowIndex,
          transactionDate: row.transactionDate,
          amount: row.amount,
          currency: row.currency,
          vendor: row.vendor,
          candidateVendors: dup.candidates.map((c) => effectiveVendor(c)),
        });
        skipped++;
        continue;
      }

      if (override) inherited++;

      if (!dryRun) {
        try {
          const r = await createExpense(data);
          const newExpense = { ...data, _id: r.insertedId, createdAt: new Date() } as Expense;
          liveExisting.push(newExpense);
          registerOverride(overrideMap, newExpense);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes('E11000') || message.toLowerCase().includes('duplicate key')) {
            skipped++;
            continue;
          }
          throw err;
        }
      }
      existingMessageIds.add(data.messageId);
      inserted++;
    }

    fileSummaries.push({
      fileName: meta.fileName,
      meta,
      parsedRows: rows.length,
      inserted,
      skipped,
      ambiguous,
      inherited,
      aiCategorized,
      ambiguousRows,
    });
  }

  return {
    files: fileSummaries,
    inserted: fileSummaries.reduce((s, f) => s + f.inserted, 0),
    skipped: fileSummaries.reduce((s, f) => s + f.skipped, 0),
    ambiguous: fileSummaries.reduce((s, f) => s + f.ambiguous, 0),
    inherited: fileSummaries.reduce((s, f) => s + f.inherited, 0),
  };
}
