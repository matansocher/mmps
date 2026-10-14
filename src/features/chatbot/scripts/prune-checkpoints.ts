import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import type { Collection, Document, Filter } from 'mongodb';
import { join } from 'node:path';
import { argv, cwd, env } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';

config({ path: join(cwd(), '.env.serve') });

const logger = new Logger('chatbot:script:prune-checkpoints');

const DB_NAME = 'Chatbot';
const CHECKPOINTS_COLLECTION = 'checkpoints';
const CHECKPOINT_WRITES_COLLECTION = 'checkpoint_writes';
// Matches the runtime pruning in PruningMongoDBSaver: keep the latest checkpoint and its parent.
const KEEP_PER_THREAD = 2;

type ThreadGroup = {
  readonly _id: { readonly thread_id: string; readonly checkpoint_ns: string };
  readonly newestIds: string[];
};

async function pruneOrCount(collection: Collection, filter: Filter<Document>, apply: boolean): Promise<number> {
  if (!apply) return collection.countDocuments(filter);
  const { deletedCount } = await collection.deleteMany(filter);
  return deletedCount;
}

async function main(): Promise<void> {
  const apply = argv.includes('--apply');
  if (!env.MONGO_DB_URL) throw new Error('MONGO_DB_URL is not set');

  const client = new MongoClient(env.MONGO_DB_URL);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    const checkpoints = db.collection(CHECKPOINTS_COLLECTION);
    const writes = db.collection(CHECKPOINT_WRITES_COLLECTION);

    const groups = await checkpoints
      .aggregate<ThreadGroup>([
        { $group: { _id: { thread_id: '$thread_id', checkpoint_ns: '$checkpoint_ns' }, newestIds: { $topN: { n: KEEP_PER_THREAD, sortBy: { checkpoint_id: -1 }, output: '$checkpoint_id' } } } },
      ])
      .toArray();

    logger.log(`Found ${groups.length} thread(s). Mode: ${apply ? 'APPLY' : 'DRY RUN (pass --apply to delete)'}`);

    let totalCheckpoints = 0;
    let totalWrites = 0;
    for (const { _id, newestIds } of groups) {
      if (newestIds.length < KEEP_PER_THREAD) continue;
      const filter = { thread_id: _id.thread_id, checkpoint_ns: _id.checkpoint_ns, checkpoint_id: { $lt: newestIds[newestIds.length - 1] } };
      const [checkpointCount, writeCount] = await Promise.all([pruneOrCount(checkpoints, filter, apply), pruneOrCount(writes, filter, apply)]);

      totalCheckpoints += checkpointCount;
      totalWrites += writeCount;
      if (checkpointCount || writeCount) logger.log(`thread ${_id.thread_id} [ns "${_id.checkpoint_ns}"]: ${checkpointCount} checkpoint(s), ${writeCount} write(s)`);
    }

    logger.log(`${apply ? 'Deleted' : 'Would delete'} ${totalCheckpoints} checkpoint(s) and ${totalWrites} write(s).`);
  } finally {
    await client.close();
  }
}

main().catch((err) => logger.error(`prune-checkpoints failed: ${getErrorMessage(err)}`));
