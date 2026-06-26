import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { MongoClient } from 'mongodb';
import { env } from 'node:process';
import { Logger } from '@core/utils';

const logger = new Logger('chatbot-checkpointer');

const CHECKPOINTS_DB_NAME = 'Chatbot';
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

export async function createChatbotCheckpointer(): Promise<MongoDBSaver> {
  const client = new MongoClient(env.MONGO_DB_URL);
  await client.connect();

  // The official saver pins mongodb v6 types while the repo uses v7; the runtime API is
  // compatible, so we cast the client at this boundary only.
  const checkpointer = new MongoDBSaver({ client: client as never, dbName: CHECKPOINTS_DB_NAME, ttl: THIRTY_DAYS_IN_SECONDS });

  const errors = await checkpointer.setup();
  errors.forEach((err) => logger.error(`checkpointer setup error: ${err.message}`));

  logger.log(`Chatbot checkpointer ready (db: ${CHECKPOINTS_DB_NAME}, ttl: ${THIRTY_DAYS_IN_SECONDS}s)`);
  return checkpointer;
}
