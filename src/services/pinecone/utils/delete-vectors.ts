import { Logger } from '@nestjs/common';
import { providePineconeClient } from './provide-pinecone-client';

const logger = new Logger('PineconeDelete');

export async function deleteVectorsById(indexName: string, ids: string[]): Promise<void> {
  const pinecone = providePineconeClient();
  const index = pinecone.index(indexName);
  await index.deleteMany(ids);
  logger.log(`Deleted ${ids.length} vectors from index ${indexName}`);
}

export async function deleteVectorsByFilter(indexName: string, filter: Record<string, any>): Promise<void> {
  const pinecone = providePineconeClient();
  const index = pinecone.index(indexName);
  await index.deleteMany(filter);
  logger.log(`Deleted vectors matching filter in index ${indexName}`);
}
