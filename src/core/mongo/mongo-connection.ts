import { Collection, Db, MongoClient } from 'mongodb';
import { env } from 'node:process';

const connections: Map<string, Db> = new Map();
const clients: MongoClient[] = [];
const pendingConnections: Map<string, Promise<void>> = new Map();

export async function createMongoConnection(dbName: string): Promise<void> {
  if (connections.has(dbName)) return;

  const pendingConnection = pendingConnections.get(dbName);
  if (pendingConnection) return pendingConnection;

  const mongoUri = env.MONGO_DB_URL;
  if (!mongoUri) throw new Error('MONGO_DB_URL environment variable is not set');

  const connection = (async () => {
    const client = new MongoClient(mongoUri);
    try {
      await client.connect();
      clients.push(client);
      connections.set(dbName, client.db(dbName));
    } catch (err) {
      await Promise.allSettled([client.close()]);
      throw err;
    }
  })();

  pendingConnections.set(dbName, connection);
  try {
    await connection;
  } finally {
    pendingConnections.delete(dbName);
  }
}

export function getMongoCollection<T = any>(dbName: string, collectionName: string): Collection<T> {
  const db = connections.get(dbName);
  if (!db) throw new Error(`No mongo connection for db '${dbName}' — call createMongoConnection('${dbName}') first`);
  return db.collection<T>(collectionName);
}

export function hasMongoConnection(dbName: string): boolean {
  return connections.has(dbName);
}

export async function closeMongoConnections(): Promise<void> {
  await Promise.allSettled(pendingConnections.values());
  await Promise.allSettled(clients.map((client) => client.close()));
  clients.length = 0;
  connections.clear();
  pendingConnections.clear();
}
