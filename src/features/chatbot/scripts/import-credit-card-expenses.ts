/**
 * Import credit-card transactions from monthly XLSX statements (Hebrew "כאל / Mizrahi" format)
 * into the chatbot expenses collection, skipping any entries that already exist in Mongo.
 *
 * Filename convention (REQUIRED): `card-<last4>-<YYYY-MM>.xlsx`
 *   Examples:
 *     card-1220-2026-05.xlsx   → Visa ending 1220, statement for May 2026
 *     card-4477-2026-06.xlsx   → Visa ending 4477, statement for June 2026
 *   The script parses `<last4>` and `<YYYY-MM>` from the filename and uses them to:
 *     - Tag every imported row with the source card and statement month (in `messageId`)
 *     - Pre-filter the Mongo dedup window to that month (faster, safer dedup)
 *     - Refuse files that don't match the convention (fail fast — explicit > implicit)
 *
 * Usage:
 *   1. Adjust the CONFIG block below (folder/file/dryRun) for the run.
 *   2. npx tsx src/features/chatbot/scripts/import-credit-card-expenses.ts
 *
 * Dedup (idempotent — re-running the same file is a no-op):
 *   1. Every row's `messageId` is deterministic: card+ym+date+currency+amount+vendor. The
 *      Mongo collection has a unique index on `messageId`, so the second run can't insert
 *      the same row even if the heuristic below were to miss it.
 *   2. As a secondary check (catches user-renamed vendors), a row is treated as a duplicate
 *      when the transaction **date** matches (same calendar day, Asia/Jerusalem) AND the
 *      **amount** matches (within 0.01) AND the **vendor** matches against either the
 *      original `vendor` or any `userVendor` override. Vendor comparison normalizes
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
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { cwd, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { read, utils } from 'xlsx';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { createExpense, type CreateExpenseData, type Currency, DB_NAME, ensureExpenseIndexes, type Expense, type ExpenseCategory, type ExpenseType, getExpensesBetween } from '@shared/expenses';
import { effectiveVendor } from '@shared/expenses';

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
  // Process every `card-<last4>-<YYYY-MM>.xlsx` in this folder. Defaults to the
  // sibling `expenses/` folder next to this script (paths are resolved against it
  // first, then against the current working directory).
  folder: 'expenses' as string,
  // Set to a single filename to import just that statement (overrides `folder`).
  // Leave empty to process the whole `folder`.
  file: '' as string, // e.g. 'card-1220-2026-05.xlsx'
  // `true` = parse & log only, no Mongo writes. Flip to `false` to actually import.
  dryRun: false,
} as const;
// =============================================================================

// --- Hebrew → category/type heuristics (avoid an LLM round-trip when sector is recognised) ---
//
// Sectors below were derived from observed XLSX statements across multiple cards (Mizrahi-1220
// monthly billed + Discount-7374 immediate-charge). When the bank adds a sector we don't
// recognise, the row falls through to "other" and the Hebrew text is preserved on the row's
// `hebrewSector` (unused at write time but useful for triaging unknowns).
const SECTOR_TO_CATEGORY: Record<string, ExpenseCategory> = {
  מסעדות: 'restaurants',
  'מזון מהיר': 'fast_food',
  'מזון ומשקאות': 'groceries',
  אנרגיה: 'fuel',
  'רכב ותחבורה': 'transport',
  'ריהוט ובית': 'home',
  'תעשיה ומכירות': 'shopping',
  'אופנה והלבשה': 'shopping',
  'רפואה ובריאות': 'health',
  'בריאות ויופי': 'health',
  'פנאי בילוי': 'entertainment',
  'תרבות ופנאי': 'entertainment',
  אירועים: 'events',
  'מלונאות ואירוח': 'travel',
  תיירות: 'travel',
  'תקשורת ומחשבים': 'communications',
  'ביטוח ופיננסים': 'insurance',
  מוסדות: 'government',
  חינוך: 'other',
  שונות: 'other',
};

const TYPE_KEYWORDS: ReadonlyArray<{ readonly hebrew: string; readonly type: ExpenseType }> = [{ hebrew: 'הוראת קבע', type: 'bill' }];

const SECTION_CURRENCY_KEYWORDS: ReadonlyArray<{ readonly match: RegExp; readonly currency: Currency }> = [
  { match: /דולר|\$/, currency: 'USD' },
  { match: /אירו|€/, currency: 'EUR' },
  { match: /פאונד|לירה שטרלינג|£/, currency: 'GBP' },
  { match: /יין יפני|¥/, currency: 'JPY' },
];

// --- Filename convention ---

const FILENAME_RE = /^card-(\d{4})-(\d{4})-(0[1-9]|1[0-2])\.xlsx$/i;

type FileMeta = {
  readonly path: string;
  readonly fileName: string;
  readonly cardLast4: string;
  readonly statementYear: number;
  readonly statementMonth: number; // 1–12
  readonly statementYm: string; // YYYY-MM
};

function parseFileMeta(filePath: string): FileMeta {
  const fileName = basename(filePath);
  const m = FILENAME_RE.exec(fileName);
  if (!m) {
    throw new Error(`Filename "${fileName}" does not match the required convention card-<last4>-<YYYY-MM>.xlsx (e.g. card-1220-2026-05.xlsx)`);
  }
  const [, cardLast4, yearStr, monthStr] = m;
  const statementYear = Number(yearStr);
  const statementMonth = Number(monthStr);
  return {
    path: filePath,
    fileName,
    cardLast4,
    statementYear,
    statementMonth,
    statementYm: `${yearStr}-${monthStr}`,
  };
}

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

type DupResult = { readonly kind: 'unique' } | { readonly kind: 'duplicate'; readonly match: Expense } | { readonly kind: 'ambiguous'; readonly candidates: ReadonlyArray<Expense> };

function findDuplicate(row: ParsedRow, pool: ReadonlyArray<Expense>): DupResult {
  const sameDateAmount = pool.filter((e) => e.currency === row.currency && Math.abs(e.amount - row.amount) < 0.01 && sameCalendarDay(e.transactionDate, row.transactionDate));
  if (sameDateAmount.length === 0) return { kind: 'unique' };

  const vendorMatches = sameDateAmount.filter((e) => isVendorMatch(effectiveVendor(e), row.vendor));
  if (vendorMatches.length === 1) return { kind: 'duplicate', match: vendorMatches[0] };
  if (vendorMatches.length > 1) return { kind: 'ambiguous', candidates: vendorMatches };
  // Date + amount matched, but vendor didn't — conservatively treat as ambiguous (user may have renamed).
  return { kind: 'ambiguous', candidates: sameDateAmount };
}

// --- User override inheritance ---
//
// When the user renames or recategorizes an existing expense (via the mini-app), that override
// is stored on that single document. Without this map, every future statement reintroduces the
// original raw vendor text and re-derives the category from the sector — silently undoing the
// user's correction for all new charges.
//
// We index every expense that carries an override by both its raw `vendor` AND its `userVendor`
// (so future imports match regardless of which name the bank prints), keeping the most-recent
// override per key. Lookup uses exact normalized match first, then the same ≥3-char substring
// heuristic used for dedup.

type OverrideEntry = { readonly userVendor?: string; readonly userCategory?: ExpenseCategory; readonly mostRecent: number };

function buildOverrideMap(pool: ReadonlyArray<Expense>): Map<string, OverrideEntry> {
  const map = new Map<string, OverrideEntry>();
  for (const e of pool) {
    if (!e.userVendor && !e.userCategory) continue;
    const ts = e.transactionDate?.getTime?.() ?? e.createdAt?.getTime?.() ?? 0;
    const keys = new Set<string>();
    const raw = normalizeName(e.vendor);
    if (raw) keys.add(raw);
    if (e.userVendor) {
      const renamed = normalizeName(e.userVendor);
      if (renamed) keys.add(renamed);
    }
    for (const k of keys) {
      const prev = map.get(k);
      if (!prev || ts > prev.mostRecent) {
        map.set(k, { userVendor: e.userVendor, userCategory: e.userCategory, mostRecent: ts });
      }
    }
  }
  return map;
}

function findOverride(rowVendor: string, map: Map<string, OverrideEntry>): OverrideEntry | null {
  const n = normalizeName(rowVendor);
  if (!n) return null;
  const exact = map.get(n);
  if (exact) return exact;
  if (n.length < 3) return null;
  let best: OverrideEntry | null = null;
  for (const [key, entry] of map) {
    if (key.length < 3) continue;
    if (key.includes(n) || n.includes(key)) {
      if (!best || entry.mostRecent > best.mostRecent) best = entry;
    }
  }
  return best;
}

function registerOverride(map: Map<string, OverrideEntry>, expense: Expense): void {
  if (!expense.userVendor && !expense.userCategory) return;
  const ts = expense.transactionDate?.getTime?.() ?? expense.createdAt?.getTime?.() ?? 0;
  const keys = new Set<string>();
  const raw = normalizeName(expense.vendor);
  if (raw) keys.add(raw);
  if (expense.userVendor) {
    const renamed = normalizeName(expense.userVendor);
    if (renamed) keys.add(renamed);
  }
  for (const k of keys) {
    const prev = map.get(k);
    if (!prev || ts > prev.mostRecent) {
      map.set(k, { userVendor: expense.userVendor, userCategory: expense.userCategory, mostRecent: ts });
    }
  }
}

// --- Insert ---

function buildMessageId(meta: FileMeta, row: ParsedRow): string {
  const dateKey = row.transactionDate.toISOString().slice(0, 10);
  const amountKey = Math.round(row.amount * 100);
  const vendorKey = normalizeName(row.vendor).slice(0, 24) || 'unknown';
  return `card-xlsx:${meta.cardLast4}:${meta.statementYm}:${dateKey}:${row.currency}:${amountKey}:${vendorKey}`;
}

function toCreateData(row: ParsedRow, meta: FileMeta, override: OverrideEntry | null): CreateExpenseData {
  const data: CreateExpenseData = {
    messageId: buildMessageId(meta, row),
    vendor: row.vendor,
    category: row.category,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
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
    const meta = parseFileMeta(f);
    const rows = parseFile(f);
    parsedFiles.push({ meta, rows });
    logger.log(`Parsed ${meta.fileName}: card=${meta.cardLast4}, statement=${meta.statementYm}, transactions=${rows.length}`);
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
  const existing = await getExpensesBetween(poolFrom, poolTo);
  logger.log(`Loaded ${existing.length} existing Mongo expense(s) in window ${poolFrom.toISOString().slice(0, 10)}..${poolTo.toISOString().slice(0, 10)}`);

  // Track inserts within this run so a duplicate row inside the same batch doesn't double-insert.
  const liveExisting: Expense[] = [...existing];
  const existingMessageIds = new Set(liveExisting.map((e) => e.messageId));
  const overrideMap = buildOverrideMap(liveExisting);
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
      const data = toCreateData(row, meta, override);

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
        logger.log(
          `[inherit] "${row.vendor}" → userVendor="${override.userVendor ?? '—'}" userCategory="${override.userCategory ?? '—'}"`,
        );
      }

      if (dryRun) {
        logger.log(
          `[would insert] ${data.transactionDate.toISOString().slice(0, 10)} ${data.amount} ${data.currency} "${data.vendor}" (${data.category}/${data.type}) [${meta.cardLast4} ${meta.statementYm}]`,
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
