import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';
import { closeMongoConnections, createMongoConnection, getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import { SAVINGS_DB_NAME, SAVINGS_PORTFOLIO_COLLECTION, SHARED_PORTFOLIO_ID } from '../constants';
import type { SavingsHolding, SavingsPortfolioDocument, SavingsSettings } from '../types';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../../../..');
const DEFAULT_HTML_PATH = resolve(REPO_ROOT, 'savings-rebalance-calculator.html');

config({ path: resolve(REPO_ROOT, '.env') });

const logger = new Logger('migrate-savings-html');

type HtmlHolding = {
  readonly id?: unknown;
  readonly account?: unknown;
  readonly name?: unknown;
  readonly geography?: unknown;
  readonly current?: unknown;
  readonly target?: unknown;
  readonly currency?: unknown;
  readonly type?: unknown;
  readonly fx?: unknown;
  readonly solid?: unknown;
  readonly note?: unknown;
};

type HtmlSavedState = {
  readonly settings?: {
    readonly fxLimit?: unknown;
    readonly solidTarget?: unknown;
  } | null;
  readonly holdings?: readonly HtmlHolding[] | null;
};

export type HtmlPortfolioMigration = {
  readonly settings: SavingsSettings;
  readonly holdings: readonly SavingsHolding[];
  readonly source: 'saved_state' | 'original_holdings';
};

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function nonNegativeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function percentage(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : fallback;
}

function extractScriptContent(html: string, id: string): string | null {
  const pattern = new RegExp(`<script[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i');
  return pattern.exec(html)?.[1]?.trim() ?? null;
}

function parseSavedState(html: string): HtmlSavedState | null {
  const content = extractScriptContent(html, 'savedState');
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as HtmlSavedState) : null;
  } catch {
    return null;
  }
}

function parseOriginalHoldings(html: string): readonly HtmlHolding[] {
  const match = /const\s+originalHoldings\s*=\s*(\[[\s\S]*?\]);/.exec(html);
  if (!match?.[1]) throw new Error('Could not find saved holdings or the originalHoldings array in the HTML file');
  const json = match[1].replace(/([{,]\s*)([A-Za-z][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) throw new Error('The originalHoldings value is not an array');
  return parsed as readonly HtmlHolding[];
}

function readInputValue(html: string, id: string, fallback: number): number {
  const inputPattern = new RegExp(`<input[^>]*\\bid=["']${id}["'][^>]*\\bvalue=["']([^"']*)["'][^>]*>`, 'i');
  return percentage(inputPattern.exec(html)?.[1], fallback);
}

function migrateHolding(holding: HtmlHolding, index: number): SavingsHolding {
  const name = text(holding.name, `השקעה ${index + 1}`);
  return {
    id: text(holding.id, `html-holding-${index + 1}`),
    account: holding.account === 'managed' ? 'managed' : 'manual',
    name,
    geography: text(holding.geography),
    currentAmountIls: 0,
    targetAmountIls: nonNegativeNumber(holding.target),
    currencyExposure: holding.currency === 'fx' || holding.fx === true ? 'fx' : 'ils',
    assetType: holding.type === 'solid' || holding.solid === true ? 'solid' : 'equity',
    owner: 'shared',
    note: text(holding.note),
  };
}

export function parseHtmlPortfolio(html: string): HtmlPortfolioMigration {
  const savedState = parseSavedState(html);
  const sourceHoldings = Array.isArray(savedState?.holdings) ? savedState.holdings : parseOriginalHoldings(html);
  const holdings = sourceHoldings.map(migrateHolding);
  if (holdings.length === 0) throw new Error('The HTML portfolio does not contain holdings');
  const ids = new Set(holdings.map((holding) => holding.id));
  if (ids.size !== holdings.length) throw new Error('The HTML portfolio contains duplicate holding IDs');

  return {
    settings: {
      depositAmountIls: 0,
      fxLimitPercent: percentage(savedState?.settings?.fxLimit, readInputValue(html, 'fxLimitInput', 45)),
      solidTargetPercent: percentage(savedState?.settings?.solidTarget, readInputValue(html, 'solidTargetInput', 20)),
      geographyTargets: {},
    },
    holdings,
    source: Array.isArray(savedState?.holdings) ? 'saved_state' : 'original_holdings',
  };
}

function parseArguments(args: readonly string[]): { readonly htmlPath: string; readonly force: boolean } {
  const force = args.includes('--force');
  const pathArgument = args.find((argument) => !argument.startsWith('--'));
  return {
    htmlPath: pathArgument ? (isAbsolute(pathArgument) ? pathArgument : resolve(process.cwd(), pathArgument)) : DEFAULT_HTML_PATH,
    force,
  };
}

async function migrateHtmlPortfolio(): Promise<void> {
  const { htmlPath, force } = parseArguments(process.argv.slice(2));
  const html = await readFile(htmlPath, 'utf8');
  const migration = parseHtmlPortfolio(html);

  if (!env.MONGO_DB_URL) throw new Error('MONGO_DB_URL environment variable is not set');
  await createMongoConnection(SAVINGS_DB_NAME);
  const collection = getMongoCollection<SavingsPortfolioDocument>(SAVINGS_DB_NAME, SAVINGS_PORTFOLIO_COLLECTION);
  const existing = await collection.findOne({ _id: SHARED_PORTFOLIO_ID });
  if (existing && !force) {
    throw new Error('A shared savings portfolio already exists. Re-run with --force only if you intend to replace it.');
  }

  const document: SavingsPortfolioDocument = {
    _id: SHARED_PORTFOLIO_ID,
    revision: (existing?.revision ?? 0) + 1,
    settings: migration.settings,
    holdings: migration.holdings,
    updatedAt: new Date(),
  };
  await collection.replaceOne({ _id: SHARED_PORTFOLIO_ID }, document, { upsert: true });

  logger.log(`Imported ${document.holdings.length} investments from ${htmlPath}`);
  logger.log(`Source: ${migration.source}; revision: ${document.revision}`);
  logger.log('All current ILS amounts were set to 0. Open /savings/ and enter the real amount for each investment.');
}

async function run(): Promise<void> {
  try {
    await migrateHtmlPortfolio();
  } catch (error) {
    logger.error(`Migration failed: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  } finally {
    await closeMongoConnections();
  }
}

const executedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (executedFile === fileURLToPath(import.meta.url)) void run();
