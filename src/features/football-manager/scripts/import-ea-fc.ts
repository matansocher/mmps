/**
 * One-time import of the EA FC 26 player dataset into MongoDB (db: FootballManager).
 *
 * Filters to Europe's top-5 leagues, aggregates clubs + leagues, and upserts
 * (idempotent, keyed by EA numeric id) into the `leagues`, `teams`, `players`
 * collections.
 *
 * Usage:
 *   # From the public GitHub mirror (default):
 *   npx tsx src/features/football-manager/scripts/import-ea-fc.ts
 *
 *   # From a local CSV (e.g. a cached copy):
 *   npx tsx src/features/football-manager/scripts/import-ea-fc.ts /path/to/players.csv
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { closeMongoConnections, createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { buildDataset, type EaFcRawPlayerRow, fetchDatasetCsv, parseCsv } from '@services/ea-fc-data';
import { FOOTBALL_MANAGER_DB_NAME } from '../constants';
import { countReferenceData, importReferenceData } from '../mongo';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../../../..');

config({ path: resolve(REPO_ROOT, '.env') });

const logger = new Logger('import-ea-fc');

async function main(): Promise<void> {
  const localPath = argv[2];

  logger.log(localPath ? `Reading dataset from local file: ${localPath}` : 'Fetching dataset from GitHub mirror…');
  const csv = localPath ? readFileSync(resolve(localPath), 'utf-8') : await fetchDatasetCsv();

  const rows = parseCsv(csv) as unknown as EaFcRawPlayerRow[];
  logger.log(`Parsed ${rows.length} raw rows.`);

  const dataset = buildDataset(rows);
  logger.log(`Top-5 filtered → ${dataset.leagues.length} leagues, ${dataset.teams.length} teams, ${dataset.players.length} players.`);

  await createMongoConnection(FOOTBALL_MANAGER_DB_NAME);
  const imported = await importReferenceData(dataset);
  logger.log(`Upserted: ${JSON.stringify(imported)}`);

  const counts = await countReferenceData();
  logger.log(`Collections now hold: ${JSON.stringify(counts)}`);

  await closeMongoConnections();
  logger.log('Done.');
}

main().catch((err) => {
  logger.error(`Import failed: ${err}`);
  exit(1);
});
