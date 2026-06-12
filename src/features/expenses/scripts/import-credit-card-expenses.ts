/**
 * Import credit-card transactions from monthly XLSX statements into the chatbot
 * expenses collection, skipping any entries that already exist in Mongo.
 *
 * Two formats are detected automatically from the file content:
 *   - Discount/Mizrahi  → single card, single month
 *   - Isracard/Cal      → full year, may mix multiple cards
 *
 * Usage:
 *   1. Adjust the CONFIG block below (folder/file/dryRun) for the run.
 *   2. npx tsx src/features/chatbot/scripts/import-credit-card-expenses.ts
 *
 * For interactive single-file uploads, just drop the .xlsx into the EXPENSES Telegram
 * bot — same pipeline, no script required.
 */
import { config } from 'dotenv';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { cwd, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { DB_NAME, ensureExpenseIndexes } from '@shared/expenses';
import { detectFormat, type FileMeta, importParsedFiles, parseInput, type ParsedRow } from '@shared/expenses/importers';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_EXPENSES_DIR = resolve(SCRIPT_DIR, 'expenses');
const REPO_ROOT = resolve(SCRIPT_DIR, '../../../..');

config({ path: resolve(REPO_ROOT, '.env') });

const logger = new Logger('import-card-xlsx');

const CONFIG = {
  folder: 'expenses' as string,
  file: '' as string,
  dryRun: false,
} as const;

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

  const parsedFiles: { meta: FileMeta; rows: ParsedRow[] }[] = [];
  for (const path of files) {
    const buffer = readFileSync(path);
    const fileName = basename(path);
    const meta = detectFormat(buffer, fileName);
    if (!meta) {
      logger.warn(`Skipping ${fileName}: not a recognized card statement format (Discount or Isracard).`);
      continue;
    }
    const rows = await parseInput({ buffer, fileName }, meta);
    parsedFiles.push({ meta, rows });
    const tag = meta.kind === 'discount' ? `card=${meta.cardLast4}, statement=${meta.statementYm}` : `cards=mixed, year=${meta.statementYear}`;
    logger.log(`Parsed ${fileName} [${meta.kind}]: ${tag}, transactions=${rows.length}`);
  }

  if (parsedFiles.length === 0) {
    logger.log('No transactions found in any input file.');
    return;
  }

  await createMongoConnection(DB_NAME);
  await ensureExpenseIndexes();

  const summary = await importParsedFiles(parsedFiles, { dryRun });
  for (const f of summary.files) {
    logger.log(`${f.fileName}: inserted=${f.inserted}, skipped=${f.skipped}, ambiguous=${f.ambiguous}, inherited=${f.inherited}`);
  }
  logger.log(`---`);
  logger.log(`Total inserted: ${summary.inserted}`);
  logger.log(`Total inherited overrides: ${summary.inherited}`);
  logger.log(`Total skipped (already in Mongo): ${summary.skipped}`);
  if (summary.ambiguous > 0) {
    logger.warn(`Ambiguous rows (skipped, please review): ${summary.ambiguous}`);
    for (const f of summary.files) {
      for (const row of f.ambiguousRows) {
        logger.warn(
          `[${row.fileName}:${row.sourceRowIndex}] ${row.transactionDate.toISOString().slice(0, 10)} ${row.amount} ${row.currency} "${row.vendor}" — matches: ${row.candidateVendors.join(', ')}`,
        );
      }
    }
  }
  if (dryRun) logger.log('Dry run complete — no changes were written.');
}

main()
  .then(() => exit(0))
  .catch((err) => {
    logger.error(`Import failed: ${err instanceof Error ? (err.stack ?? err.message) : err}`);
    exit(1);
  });
