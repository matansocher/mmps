import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { env } from 'node:process';
import { createMongoConnection, getMongoCollection } from '@core/mongo';

let container: StartedTestContainer | null = null;

export async function startMongoContainer(dbName: string): Promise<void> {
  container = await new GenericContainer('mongo:7')
    .withExposedPorts(27017)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(27017);
  env.MONGO_DB_URL = `mongodb://${host}:${port}`;

  await createMongoConnection(dbName);
}

export async function clearCollection(dbName: string, collectionName: string): Promise<void> {
  const collection = getMongoCollection(dbName, collectionName);
  await collection.deleteMany({});
}

export async function stopMongoContainer(): Promise<void> {
  if (container) {
    await container.stop();
    container = null;
  }
}
