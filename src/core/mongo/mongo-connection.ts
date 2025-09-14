import { Collection, Db, MongoClient } from 'mongodb';
import { env } from 'node:process';

const connections: Map<string, Db> = new Map();

export async function createMongoConnection(dbName: string): Promise<void> {
  const mongoUri = env.MONGO_DB_URL;
  const client = new MongoClient(mongoUri);
  await client.connect();
  connections.set(dbName, client.db(dbName));
}

export async function getMongoDb(dbName: string): Promise<Db> {
  if (!connections.has(dbName)) {
    await createMongoConnection(dbName);
  }
  return connections.get(dbName)!;
}

export function getMongoCollection<T = any>(db: Db, collectionName: string): Collection<T> {
  return db.collection<T>(collectionName);
}

export function getCollection<T = any>(dbName: string, collectionName: string): Collection<T> {
  const db = connections.get(dbName);
  return db.collection<T>(collectionName);
}
