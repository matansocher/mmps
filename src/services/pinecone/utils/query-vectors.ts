import { VectorMetadata } from '../types';
import { providePineconeClient } from './provide-pinecone-client';

export type VectorMatch = {
  id: string;
  score: number;
  metadata?: VectorMetadata;
};

export async function queryVectors(indexName: string, vector: number[], topK: number = 5, filter?: Record<string, any>): Promise<VectorMatch[]> {
  const pinecone = providePineconeClient();
  const index = pinecone.index(indexName);

  const queryResponse = await index.query({
    vector,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  });

  return queryResponse.matches.map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata as VectorMetadata,
  }));
}
