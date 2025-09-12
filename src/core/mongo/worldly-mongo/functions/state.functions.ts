import { getCollection, getMongoDb } from '@core/mongo/shared';
import { State } from '../models';
import { COLLECTIONS, DB_NAME } from '../worldly-mongo.config';

let _states: State[] | null = null;

export async function getAllStates(): Promise<State[]> {
  if (!_states) {
    const db = await getMongoDb(DB_NAME);
    const collection = getCollection<State>(db, COLLECTIONS.STATE);
    _states = await collection.find().toArray();
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
