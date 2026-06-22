import { Collection, Db, MongoClient } from 'mongodb';
import { env } from 'node:process';

const connections: Map<string, Db> = new Map();
const clients: MongoClient[] = [];

export async function createMongoConnection(dbName: string): Promise<void> {
  const mongoUri = env.MONGO_DB_URL;
  const client = new MongoClient(mongoUri);
  await client.connect();
  clients.push(client);
  connections.set(dbName, client.db(dbName));
}

export function getMongoCollection<T = any>(dbName: string, collectionName: string): Collection<T> {
  const db = connections.get(dbName);
  return db.collection<T>(collectionName);
}

export async function closeMongoConnections(): Promise<void> {
  await Promise.allSettled(clients.map((client) => client.close()));
  clients.length = 0;
  connections.clear();
}
