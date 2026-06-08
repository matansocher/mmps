/**
 * Import credit-card transactions from monthly XLSX statements into the chatbot
 * expenses collection, skipping any entries that already exist in Mongo.
 *
 * Supported filename conventions (the dispatcher picks the right parser):
 *   - `card-<last4>-<YYYY>-<MM>.xlsx`  → Discount/Mizrahi (single card, single month)
 *   - `card-<last4>-<YYYY>.xlsx`       → Isracard/Cal (full year, may mix multiple cards)
 *
 * Usage:
 *   1. Adjust the CONFIG block below (folder/file/dryRun) for the run.
 *   2. npx tsx src/features/chatbot/scripts/import-credit-card-expenses.ts
 *
 * Dedup (idempotent — re-running the same file is a no-op):
 *   1. Every row's `messageId` is deterministic: card+ym+date+currency+amount+vendor.
 *      The Mongo collection has a unique index on `messageId`, so the second run can't
 *      insert the same row even if the heuristic below were to miss it.
 *   2. As a secondary check (catches user-renamed vendors), a row is treated as a
 *      duplicate when the transaction **date** matches (same calendar day, Asia/Jerusalem)
 *      AND the **amount** matches (within 0.01) AND the **vendor** matches against either
 *      the original `vendor` or any `userVendor` override. Vendor comparison normalizes
 *      casing/whitespace/Hebrew niqqud. Date+amount-only matches are flagged as ambiguous
 *      and skipped (review manually).
 *
 * Vendor-override inheritance (keeps the user's manual edits from being silently lost):
 *   When a row's vendor (after normalization) matches the vendor of any existing expense
 *   that already carries a `userVendor` and/or `userCategory` override, the new row inherits
 *   those overrides automatically. The most-recent override wins on collisions, and lookups
 *   match against both the original `vendor` and any `userVendor` so the bank's raw text
 *   AND the user's preferred name both find the same overrides.
 */
import { config } from 'dotenv';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { cwd, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { createExpense, type CreateExpenseData, DB_NAME, effectiveVendor, ensureExpenseIndexes, type Expense, getAllOverriddenExpenses, getExpensesBetween } from '@shared/expenses';
import { findDuplicate, normalizeName } from './lib/dedup';
import { type FileMeta, parseFileMeta } from './lib/filename';
import { buildOverrideMap, findOverride, type OverrideEntry, registerOverride } from './lib/override-map';
import { parseDiscountFile } from './parsers/discount';
import { parseIsracardFile } from './parsers/isracard';
import type { ParsedRow } from './parsers/types';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_EXPENSES_DIR = resolve(SCRIPT_DIR, 'expenses');
// Script lives at src/features/chatbot/scripts — repo root is four levels up.
const REPO_ROOT = resolve(SCRIPT_DIR, '../../../..');

config({ path: resolve(REPO_ROOT, '.env') });

const logger = new Logger('import-card-xlsx');

// =============================================================================
// CONFIG — adjust before running. `file` (when set) takes priority over `folder`.
// =============================================================================
const CONFIG = {
  // Process every supported `card-...xlsx` in this folder. Defaults to the sibling
  // `expenses/` folder next to this script (paths are resolved against it first, then
  // against the current working directory).
  folder: 'expenses' as string,
  // Set to a single filename to import just that statement (overrides `folder`).
  // Leave empty to process the whole `folder`.
  file: '' as string, // e.g. 'card-1220-2026-05.xlsx'
  // `true` = parse & log only, no Mongo writes. Flip to `false` to actually import.
  dryRun: false,
} as const;
// =============================================================================

// --- Dispatcher: route a single file to the right parser ---

function parseFile(meta: FileMeta): Promise<ParsedRow[]> | ParsedRow[] {
  switch (meta.kind) {
    case 'discount':
      return parseDiscountFile(meta);
    case 'isracard':
      return parseIsracardFile(meta);
  }
}

// --- Insert helpers ---

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

// --- CLI ---

function resolveInputFiles(opts: { folder?: string; file?: string }): string[] {
  if (opts.file) {
    const candidates = [
      isAbsolute(opts.file) ? opts.file : null,
      isAbsolute(opts.file) ? null : resolve(DEFAULT_EXPENSES_DIR, opts.file),
      isAbsolute(opts.file) ? null : resolve(cwd(), opts.file),
    ].filter((p): p is string => !!p);
    const found = candidates.find((p) => existsSync(p));
    if (!found) throw new Error(`File not found: tried ${candidates.join(', ')}`);
    return [found];
  }
  // Relative `folder` is anchored to the script dir (so the default `'expenses'`
  // points at the sibling folder regardless of cwd). Absolute paths are honoured as-is.
  const folder = opts.folder ? (isAbsolute(opts.folder) ? opts.folder : resolve(SCRIPT_DIR, opts.folder)) : DEFAULT_EXPENSES_DIR;
  if (!existsSync(folder) || !statSync(folder).isDirectory()) throw new Error(`Folder not found: ${folder}`);
  return readdirSync(folder)
    .filter((name) => name.toLowerCase().endsWith('.xlsx') && !name.startsWith('~$'))
    .map((name) => join(folder, name))
    .sort();
}

async function main() {
  const { folder, file, dryRun } = CONFIG;
  const files = resolveInputFiles({ folder, file });
  logger.log(`Found ${files.length} XLSX file(s) to process${dryRun ? ' (dry run)' : ''}`);

  // Parse filename metadata first so we fail fast on naming-convention violations
  // before we hit the bank/Mongo, then parse contents.
  const parsedFiles: { meta: FileMeta; rows: ParsedRow[] }[] = [];
  for (const f of files) {
    let meta: FileMeta;
    try {
      meta = parseFileMeta(f);
    } catch (err) {
      logger.warn(`Skipping ${f}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    const rows = await parseFile(meta);
    parsedFiles.push({ meta, rows });
    const tag = meta.kind === 'discount' ? `card=${meta.cardLast4}, statement=${meta.statementYm}` : `cards=mixed, year=${meta.statementYear}`;
    logger.log(`Parsed ${meta.fileName} [${meta.kind}]: ${tag}, transactions=${rows.length}`);
  }

  const everyRow = parsedFiles.flatMap((b) => b.rows);
  if (everyRow.length === 0) {
    logger.log('No transactions found in any input file.');
    return;
  }

  const minDate = new Date(Math.min(...everyRow.map((r) => r.transactionDate.getTime())));
  const maxDate = new Date(Math.max(...everyRow.map((r) => r.transactionDate.getTime())));
  // Widen ±1 day to safely cover timezone edges.
  const poolFrom = new Date(minDate.getTime() - 24 * 60 * 60 * 1000);
  const poolTo = new Date(maxDate.getTime() + 2 * 24 * 60 * 60 * 1000);

  await createMongoConnection(DB_NAME);
  await ensureExpenseIndexes();
  // Two separate loads on purpose:
  //   1) `existing` is the date-bounded dedup pool — keeps the duplicate-check fast and accurate.
  //   2) `overridden` is the unbounded set of expenses that carry user overrides — needed so
  //      a vendor rename made in (say) March still propagates to a June re-import.
  const [existing, overridden] = await Promise.all([getExpensesBetween(poolFrom, poolTo), getAllOverriddenExpenses()]);
  logger.log(`Loaded ${existing.length} existing Mongo expense(s) in window ${poolFrom.toISOString().slice(0, 10)}..${poolTo.toISOString().slice(0, 10)}`);
  logger.log(`Loaded ${overridden.length} overridden expense(s) (all time) for vendor-override inheritance`);

  // Track inserts within this run so a duplicate row inside the same batch doesn't double-insert.
  const liveExisting: Expense[] = [...existing];
  const existingMessageIds = new Set(liveExisting.map((e) => e.messageId));
  // Build override map from the unbounded set so it's not date-windowed. Live inserts
  // continue to register into the same map below.
  const overrideMap = buildOverrideMap(overridden);
  logger.log(`Loaded ${overrideMap.size} vendor override key(s) for inheritance`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalAmbiguous = 0;
  let totalInherited = 0;
  const ambiguousReport: string[] = [];

  for (const { meta, rows } of parsedFiles) {
    let inserted = 0;
    let skipped = 0;
    let ambiguous = 0;
    let inherited = 0;
    for (const row of rows) {
      const override = findOverride(row.vendor, overrideMap);
      const data = toCreateData(row, override);

      // Fast path: deterministic messageId already in Mongo (re-run of same file).
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
        ambiguousReport.push(
          `[${meta.fileName}:${row.sourceRowIndex}] ${row.transactionDate.toISOString().slice(0, 10)} ${row.amount} ${row.currency} "${row.vendor}" — matches ${dup.candidates.length} existing expense(s): ${dup.candidates
            .map((c) => `"${effectiveVendor(c)}"(#${c._id?.toString()})`)
            .join(', ')}. Skipping to avoid duplicates; review manually if needed.`,
        );
        skipped++;
        continue;
      }

      if (override) {
        inherited++;
        logger.log(`[inherit] "${row.vendor}" → userVendor="${override.userVendor ?? '—'}" userCategory="${override.userCategory ?? '—'}"`);
      }

      if (dryRun) {
        logger.log(
          `[would insert] ${data.transactionDate.toISOString().slice(0, 10)} ${data.amount} ${data.currency} "${data.vendor}" (${data.category}/${data.type}) [${row.cardLast4} ${row.statementYm}]`,
        );
      } else {
        try {
          const r = await createExpense(data);
          const newExpense = { ...data, _id: r.insertedId, createdAt: new Date() } as Expense;
          liveExisting.push(newExpense);
          registerOverride(overrideMap, newExpense);
        } catch (err) {
          // Most likely a unique-index collision on messageId (re-running same file) — count as skip.
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
    logger.log(`${meta.fileName}: inserted=${inserted}, skipped=${skipped}, ambiguous=${ambiguous}, inherited=${inherited}`);
    totalInserted += inserted;
    totalSkipped += skipped;
    totalAmbiguous += ambiguous;
    totalInherited += inherited;
  }

  logger.log(`---`);
  logger.log(`Total inserted: ${totalInserted}`);
  logger.log(`Total inherited overrides: ${totalInherited}`);
  logger.log(`Total skipped (already in Mongo): ${totalSkipped}`);
  if (totalAmbiguous > 0) {
    logger.warn(`Ambiguous rows (skipped, please review): ${totalAmbiguous}`);
    for (const line of ambiguousReport) logger.warn(line);
  }
  if (dryRun) logger.log('Dry run complete — no changes were written.');
}

main()
  .then(() => exit(0))
  .catch((err) => {
    logger.error(`Import failed: ${err instanceof Error ? (err.stack ?? err.message) : err}`);
    exit(1);
  });
