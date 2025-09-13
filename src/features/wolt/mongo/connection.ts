import { Db } from 'mongodb';
import { getMongoCollection, getMongoDb } from '@core/mongo/shared';
import { DB_NAME } from './constants';

let db: Db;

(async () => {
  db = await getMongoDb(DB_NAME);
})();

export async function getCollection<T>(name: string) {
  return getMongoCollection<T>(db, name);
}
