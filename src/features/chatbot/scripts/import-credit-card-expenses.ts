/**
 * Import credit-card transactions from monthly XLSX statements (Hebrew "כאל / Mizrahi" format)
 * into the chatbot expenses collection, skipping any entries that already exist in Mongo.
 *
 * Usage:
 *   npx tsx src/features/chatbot/scripts/import-credit-card-expenses.ts
 *   npx tsx src/features/chatbot/scripts/import-credit-card-expenses.ts --folder expenses-examples
 *   npx tsx src/features/chatbot/scripts/import-credit-card-expenses.ts --file "expenses-examples/some.xlsx"
 *   npx tsx src/features/chatbot/scripts/import-credit-card-expenses.ts --dry-run
 *
 * Dedup rule (per the user's spec): an XLSX row is treated as a duplicate of an existing Mongo
 * expense when the **transaction date** matches (same calendar day, Asia/Jerusalem) AND the
 * **amount** matches (within 0.01) AND the **vendor** matches. Vendor comparison normalizes
 * casing/whitespace and is tolerant of either the original `vendor` or any `userVendor`
 * override the user applied. When multiple existing expenses share the same date+amount the
 * vendor disambiguates which one (if any) is the dup.
 */
import { read, utils } from 'xlsx';
import { config } from 'dotenv';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { argv, cwd, exit } from 'node:process';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import {
  createExpense,
  DB_NAME,
  ensureExpenseIndexes,
  getExpensesBetween,
  type CreateExpenseData,
  type Currency,
  type Expense,
  type ExpenseCategory,
  type ExpenseType,
} from '@shared/expenses';
import { effectiveVendor } from '@shared/expenses';

config({ path: join(cwd(), '.env') });

const logger = new Logger('import-card-xlsx');

// --- Hebrew → category/type heuristics (avoid an LLM round-trip when sector is recognised) ---

const SECTOR_TO_CATEGORY: Record<string, ExpenseCategory> = {
  'מסעדות': 'food',
  'מזון ומשקאות': 'groceries',
  'אירועים': 'entertainment',
  'ביטוח ופיננסים': 'bills',
  'מלונאות ואירוח': 'entertainment',
  'מוסדות': 'bills',
  'תעשיה ומכירות': 'shopping',
  'רכב ותחבורה': 'transport',
  'תקשורת ומחשבים': 'utilities',
  'תיירות': 'entertainment',
  'אופנה והלבשה': 'shopping',
  'בריאות ויופי': 'health',
  'תרבות ופנאי': 'entertainment',
  'חינוך': 'other',
};

const TYPE_KEYWORDS: ReadonlyArray<{ readonly hebrew: string; readonly type: ExpenseType }> = [
  { hebrew: 'הוראת קבע', type: 'bill' },
];

const SECTION_CURRENCY_KEYWORDS: ReadonlyArray<{ readonly match: RegExp; readonly currency: Currency }> = [
  { match: /דולר|\$/, currency: 'USD' },
  { match: /אירו|€/, currency: 'EUR' },
  { match: /פאונד|לירה שטרלינג|£/, currency: 'GBP' },
  { match: /יין יפני|¥/, currency: 'JPY' },
];

// --- XLSX parsing ---

type ParsedRow = {
  readonly transactionDate: Date;
  readonly vendor: string;
  readonly amount: number;
  readonly currency: Currency;
  readonly type: ExpenseType;
  readonly category: ExpenseCategory;
  readonly hebrewSector: string;
  readonly sourceRowIndex: number;
};

function excelSerialToDate(serial: number): Date {
  // Excel epoch (1899-12-30) → Unix epoch offset is 25569 days.
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function detectSectionCurrency(text: string): Currency | null {
  for (const { match, currency } of SECTION_CURRENCY_KEYWORDS) {
    if (match.test(text)) return currency;
  }
  return null;
}

function categorizeFromSector(sector: string): ExpenseCategory {
  if (sector && SECTOR_TO_CATEGORY[sector]) return SECTOR_TO_CATEGORY[sector];
  return 'other';
}

function typeFromHebrewType(hebrewType: string): ExpenseType {
  for (const { hebrew, type } of TYPE_KEYWORDS) if (hebrewType.includes(hebrew)) return type;
  // Anything else from a credit-card statement is effectively a card charge.
  return 'card_alert';
}

function parseFile(filePath: string): ParsedRow[] {
  const buf = readFileSync(filePath);
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
      category: categorizeFromSector(hebrewSector),
      hebrewSector,
      sourceRowIndex: i + 1,
    });
  }

  return parsed;
}

// --- Dedup ---

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0591-\u05c7]/g, '') // strip Hebrew niqqud
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');
}

function isVendorMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type DupResult =
  | { readonly kind: 'unique' }
  | { readonly kind: 'duplicate'; readonly match: Expense }
  | { readonly kind: 'ambiguous'; readonly candidates: ReadonlyArray<Expense> };

function findDuplicate(row: ParsedRow, pool: ReadonlyArray<Expense>): DupResult {
  const sameDateAmount = pool.filter(
    (e) => e.currency === row.currency && Math.abs(e.amount - row.amount) < 0.01 && sameCalendarDay(e.transactionDate, row.transactionDate),
  );
  if (sameDateAmount.length === 0) return { kind: 'unique' };

  const vendorMatches = sameDateAmount.filter((e) => isVendorMatch(effectiveVendor(e), row.vendor));
  if (vendorMatches.length === 1) return { kind: 'duplicate', match: vendorMatches[0] };
  if (vendorMatches.length > 1) return { kind: 'ambiguous', candidates: vendorMatches };
  // Date + amount matched, but vendor didn't — conservatively treat as ambiguous (user may have renamed).
  return { kind: 'ambiguous', candidates: sameDateAmount };
}

// --- Insert ---

function buildMessageId(file: string, row: ParsedRow): string {
  const dateKey = row.transactionDate.toISOString().slice(0, 10);
  const amountKey = Math.round(row.amount * 100);
  const vendorKey = normalizeName(row.vendor).slice(0, 24) || 'unknown';
  return `card-xlsx:${basename(file)}:${dateKey}:${row.currency}:${amountKey}:${vendorKey}`;
}

function toCreateData(row: ParsedRow, file: string): CreateExpenseData {
  return {
    messageId: buildMessageId(file, row),
    vendor: row.vendor,
    category: row.category,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    transactionDate: row.transactionDate,
  };
}

// --- CLI ---

function parseArgs(): { folder?: string; file?: string; dryRun: boolean } {
  const args = argv.slice(2);
  let folder: string | undefined;
  let file: string | undefined;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--folder') folder = args[++i];
    else if (a === '--file') file = args[++i];
    else if (a.startsWith('--folder=')) folder = a.slice('--folder='.length);
    else if (a.startsWith('--file=')) file = a.slice('--file='.length);
  }
  return { folder, file, dryRun };
}

function resolveInputFiles(opts: { folder?: string; file?: string }): string[] {
  if (opts.file) {
    const p = isAbsolute(opts.file) ? opts.file : resolve(cwd(), opts.file);
    if (!existsSync(p)) throw new Error(`File not found: ${p}`);
    return [p];
  }
  const folder = opts.folder ? (isAbsolute(opts.folder) ? opts.folder : resolve(cwd(), opts.folder)) : resolve(cwd(), 'expenses-examples');
  if (!existsSync(folder) || !statSync(folder).isDirectory()) throw new Error(`Folder not found: ${folder}`);
  return readdirSync(folder)
    .filter((name) => name.toLowerCase().endsWith('.xlsx') && !name.startsWith('~$'))
    .map((name) => join(folder, name))
    .sort();
}

async function main() {
  const { folder, file, dryRun } = parseArgs();
  const files = resolveInputFiles({ folder, file });
  logger.log(`Found ${files.length} XLSX file(s) to process${dryRun ? ' (dry run)' : ''}`);

  // Parse first so we know the full date range and only pull existing expenses once.
  const allRows: { file: string; rows: ParsedRow[] }[] = [];
  for (const f of files) {
    const rows = parseFile(f);
    allRows.push({ file: f, rows });
    logger.log(`Parsed ${basename(f)}: ${rows.length} transactions`);
  }

  const everyRow = allRows.flatMap((b) => b.rows);
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
  const existing = await getExpensesBetween(poolFrom, poolTo);
  logger.log(`Loaded ${existing.length} existing Mongo expense(s) in window ${poolFrom.toISOString().slice(0, 10)}..${poolTo.toISOString().slice(0, 10)}`);

  // Track inserts within this run so a duplicate row inside the same batch doesn't double-insert.
  const liveExisting: Expense[] = [...existing];

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalAmbiguous = 0;
  const ambiguousReport: string[] = [];

  for (const { file: f, rows } of allRows) {
    let inserted = 0;
    let skipped = 0;
    let ambiguous = 0;
    for (const row of rows) {
      const dup = findDuplicate(row, liveExisting);
      if (dup.kind === 'duplicate') {
        skipped++;
        continue;
      }
      if (dup.kind === 'ambiguous') {
        ambiguous++;
        ambiguousReport.push(
          `[${basename(f)}:${row.sourceRowIndex}] ${row.transactionDate.toISOString().slice(0, 10)} ${row.amount} ${row.currency} "${row.vendor}" — matches ${dup.candidates.length} existing expense(s): ${dup.candidates
            .map((c) => `"${effectiveVendor(c)}"(#${c._id?.toString()})`)
            .join(', ')}. Skipping to avoid duplicates; review manually if needed.`,
        );
        skipped++;
        continue;
      }

      const data = toCreateData(row, f);
      if (dryRun) {
        logger.log(`[would insert] ${data.transactionDate.toISOString().slice(0, 10)} ${data.amount} ${data.currency} "${data.vendor}" (${data.category}/${data.type})`);
      } else {
        try {
          const r = await createExpense(data);
          liveExisting.push({ ...data, _id: r.insertedId, createdAt: new Date() } as Expense);
        } catch (err) {
          // Most likely a unique-index collision (re-running same file) — count as skip.
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes('E11000') || message.toLowerCase().includes('duplicate key')) {
            skipped++;
            continue;
          }
          throw err;
        }
      }
      inserted++;
    }
    logger.log(`${basename(f)}: inserted=${inserted}, skipped=${skipped}, ambiguous=${ambiguous}`);
    totalInserted += inserted;
    totalSkipped += skipped;
    totalAmbiguous += ambiguous;
  }

  logger.log(`---`);
  logger.log(`Total inserted: ${totalInserted}`);
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
    logger.error(`Import failed: ${err instanceof Error ? err.stack ?? err.message : err}`);
    exit(1);
  });
