import { Logger } from '@core/utils';
import { VectorMetadata } from '../types';
import { providePineconeClient } from './provide-pinecone-client';

const logger = new Logger('PineconeUpsert');

export async function upsertVector(indexName: string, id: string, embedding: number[], metadata: VectorMetadata): Promise<void> {
  const pinecone = providePineconeClient();
  const index = pinecone.index(indexName);

  await index.upsert([{ id, values: embedding, metadata }]);

  logger.log(`Stored vector ${id} in index ${indexName}`);
}
