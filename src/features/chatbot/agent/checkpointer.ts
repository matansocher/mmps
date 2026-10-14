import type { RunnableConfig } from '@langchain/core/runnables';
import type { Checkpoint, CheckpointMetadata } from '@langchain/langgraph';
import { MongoDBSaver, type MongoDBSaverParams } from '@langchain/langgraph-checkpoint-mongodb';
import { getMongoClient } from '@core/mongo';
import { getErrorMessage, Logger } from '@core/utils';

const logger = new Logger('chatbot:checkpointer');

const CHECKPOINTS_DB_NAME = 'Chatbot';
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

// LangGraph writes a full state snapshot after every graph step, but resuming a thread only reads the latest one.
// After each save we drop everything older than the new checkpoint's parent, so each thread keeps just 2 snapshots.
// Checkpoint ids are uuid6 (time-ordered), so `$lt` on the id string means "older than".
export class PruningMongoDBSaver extends MongoDBSaver {
  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
    const result = await super.put(config, checkpoint, metadata);
    const threadId = config.configurable?.thread_id;
    const parentId = config.configurable?.checkpoint_id;
    if (typeof threadId === 'string' && typeof parentId === 'string') {
      await this.pruneOlderThan(threadId, config.configurable?.checkpoint_ns ?? '', parentId);
    }
    return result;
  }

  private async pruneOlderThan(threadId: string, checkpointNs: string, checkpointId: string): Promise<void> {
    const filter = { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: { $lt: checkpointId } };
    try {
      await Promise.all([this.db.collection(this.checkpointCollectionName).deleteMany(filter), this.db.collection(this.checkpointWritesCollectionName).deleteMany(filter)]);
    } catch (err) {
      logger.warn(`Failed to prune old checkpoints for thread ${threadId}: ${getErrorMessage(err)}`);
    }
  }
}

export async function createChatbotCheckpointer(): Promise<MongoDBSaver> {
  const client = await getMongoClient();

  // The official saver pins mongodb v6 types while the repo uses v7; the runtime API is
  // compatible, so we narrow to the saver's expected client type at this boundary only.
  const checkpointer = new PruningMongoDBSaver({ client: client as unknown as MongoDBSaverParams['client'], dbName: CHECKPOINTS_DB_NAME, ttl: THIRTY_DAYS_IN_SECONDS });

  const errors = await checkpointer.setup();
  if (errors.length > 0) {
    errors.forEach((err) => logger.error(`checkpointer setup error: ${getErrorMessage(err)}`));
    throw new Error(`Chatbot checkpointer setup failed with ${errors.length} error(s): ${errors.map(getErrorMessage).join('; ')}`);
  }

  logger.log(`Chatbot checkpointer ready (db: ${CHECKPOINTS_DB_NAME}, ttl: ${THIRTY_DAYS_IN_SECONDS}s)`);
  return checkpointer;
}
