import { Collection, Db, MongoClient } from 'mongodb';
import { env } from 'node:process';

const connections: Map<string, Db> = new Map();

export async function getMongoDb(dbName: string): Promise<Db> {
  if (!connections.has(dbName)) {
    const mongoUri = env.MONGO_DB_URL;
    const client = new MongoClient(mongoUri);
    await client.connect();
    connections.set(dbName, client.db(dbName));
  }
  return connections.get(dbName)!;
}

export function getCollection<T = any>(db: Db, collectionName: string): Collection<T> {
  return db.collection<T>(collectionName);
}
