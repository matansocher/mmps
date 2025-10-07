import { Pinecone } from '@pinecone-database/pinecone';
import { env } from 'node:process';

let pineconeClientInstance: Pinecone | null = null;

export function providePineconeClient(): Pinecone {
  if (pineconeClientInstance) {
    return pineconeClientInstance;
  }
  const apiKey = env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is not set');
  }
  pineconeClientInstance = new Pinecone({ apiKey });
  return pineconeClientInstance;
}
