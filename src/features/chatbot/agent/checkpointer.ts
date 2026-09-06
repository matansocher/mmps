import { MongoDBSaver } from '@langchain/langgraph-checkpoint-mongodb';
import { getMongoClient } from '@core/mongo';
import { getErrorMessage, Logger } from '@core/utils';

const logger = new Logger('chatbot:checkpointer');

const CHECKPOINTS_DB_NAME = 'Chatbot';
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

export async function createChatbotCheckpointer(): Promise<MongoDBSaver> {
  const client = await getMongoClient();

  // The official saver pins mongodb v6 types while the repo uses v7; the runtime API is
  // compatible, so we cast the client at this boundary only.
  const checkpointer = new MongoDBSaver({ client: client as never, dbName: CHECKPOINTS_DB_NAME, ttl: THIRTY_DAYS_IN_SECONDS });

  const errors = await checkpointer.setup();
  errors.forEach((err) => logger.error(`checkpointer setup error: ${getErrorMessage(err)}`));

  logger.log(`Chatbot checkpointer ready (db: ${CHECKPOINTS_DB_NAME}, ttl: ${THIRTY_DAYS_IN_SECONDS}s)`);
  return checkpointer;
}
