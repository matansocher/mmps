import { getMongoCollection } from '@core/mongo';
import type { ChilliPrompt } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<ChilliPrompt>(DB_NAME, 'Prompt');

export async function getPrompt(): Promise<string | null> {
  const doc = await getCollection().findOne({}, { sort: { createdAt: -1 } });
  return doc?.text ?? null;
}

export async function insertPromptVersion(text: string): Promise<void> {
  await getCollection().insertOne({ text, createdAt: new Date() } as ChilliPrompt);
}
