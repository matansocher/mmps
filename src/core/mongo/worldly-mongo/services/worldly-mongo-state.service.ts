import { Collection, Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { State } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../worldly-mongo.config';

@Injectable()
export class WorldlyMongoStateService {
  private readonly stateCollection: Collection<State>;
  private states: State[] = [];

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.stateCollection = this.db.collection(COLLECTIONS.STATE);
    this.stateCollection
      .find()
      .toArray()
      .then((states) => {
        this.states = states;
      });
  }

  getAllStates(): State[] {
    return this.states;
  }

  getStateByName(state: string): State {
    const allStates = this.getAllStates();
    return allStates.find((s) => s.name === state);
  }

  getRandomState(filter: (country: State) => boolean): State {
    const allStates = this.getAllStates();
    const filteredStates = allStates.filter(filter);
    return filteredStates[Math.floor(Math.random() * filteredStates.length)];
  }
}
