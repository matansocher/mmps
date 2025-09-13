import { State } from '@core/mongo/worldly-mongo';
import { getCollection } from './connection';
import { COLLECTIONS } from './constants';

let states: State[] = [];

export async function getAllStates(): Promise<State[]> {
  if (states.length) {
    return states;
  }
  const countryCollection = await getCollection<State>(COLLECTIONS.STATE);
  await countryCollection
    .find()
    .toArray()
    .then((s) => {
      states = s;
    });
  return states;
}

export async function getStateByName(state: string): Promise<State> {
  const allStates = await getAllStates();
  return allStates.find((s) => s.name === state);
}

export async function getRandomState(filter: (country: State) => boolean): Promise<State> {
  const allStates = await getAllStates();
  const filteredStates = allStates.filter(filter);
  return filteredStates[Math.floor(Math.random() * filteredStates.length)];
}
