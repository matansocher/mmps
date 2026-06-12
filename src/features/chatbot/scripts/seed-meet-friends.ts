import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import { createMongoConnection } from '@core/mongo';
import { Logger } from '@core/utils';
import { addMeetFriend, DB_NAME, findMeetFriendByName } from '@shared/meet-friends';

const logger = new Logger('SeedMeetFriends');

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../../../..');
config({ path: resolve(REPO_ROOT, '.env') });

// Edit this list, or pass names as CLI args:
//   tsx src/features/chatbot/scripts/seed-meet-friends.ts "Alice" "Bob"
const names: string[] = ['Dani & Jacob', 'Ran & Idan', 'Lee & Daniel', 'Shaked & Guy', 'Workflows', 'Dagey & Yotam', 'Red Bostonian Jeep', 'Amit & Ariel', 'Buri & Liran'];

async function main(): Promise<void> {
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))];

  if (cleaned.length === 0) {
    logger.warn('No names provided. Pass names as args or edit DEFAULT_NAMES.');
    return;
  }

  await createMongoConnection(DB_NAME);

  let inserted = 0;
  let skipped = 0;

  for (const name of cleaned) {
    const existing = await findMeetFriendByName(name);
    if (existing) {
      logger.log(`Skipped (already exists): ${name}`);
      skipped++;
      continue;
    }
    await addMeetFriend({ name });
    logger.log(`Inserted: ${name}`);
    inserted++;
  }

  logger.log(`---`);
  logger.log(`Total inserted: ${inserted}`);
  logger.log(`Total skipped: ${skipped}`);
}

main()
  .then(() => exit(0))
  .catch((err) => {
    logger.error(`Seed failed: ${err instanceof Error ? (err.stack ?? err.message) : err}`);
    exit(1);
  });
