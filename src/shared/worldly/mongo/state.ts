import { getMongoCollection } from '@core/mongo';
import { State } from '../types';
import { DB_NAME } from './constants';

let states: State[] = [];

const getCollection = () => getMongoCollection<State>(DB_NAME, 'State');

export async function getAllStates(): Promise<State[]> {
  if (states.length) {
    return states;
  }
  const countryCollection = getCollection();
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
