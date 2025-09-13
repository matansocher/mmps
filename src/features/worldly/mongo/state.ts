import { Collection, Db } from 'mongodb';
import { getMongoCollection, getMongoDb } from '@core/mongo/shared';
import { State } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let stateCollection: Collection<State>;

(async () => {
  db = await getMongoDb(DB_NAME);
  stateCollection = getMongoCollection<State>(db, COLLECTIONS.STATE);
})();

let _states: State[] | null = null;

export async function getAllStates(): Promise<State[]> {
  if (!_states) {
    _states = await stateCollection.find().toArray();
  }
  return _states;
}

export async function getStateByName(stateName: string): Promise<State | undefined> {
  const allStates = await getAllStates();
  return allStates.find((s) => s.name === stateName);
}

export async function getRandomState(filter: (state: State) => boolean): Promise<State | undefined> {
  const allStates = await getAllStates();
  const filteredStates = allStates.filter(filter);
  if (filteredStates.length === 0) return undefined;
  return filteredStates[Math.floor(Math.random() * filteredStates.length)];
}
