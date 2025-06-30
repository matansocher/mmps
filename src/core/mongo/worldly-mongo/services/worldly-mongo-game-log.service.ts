import { Collection, Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { GameLog } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../worldly-mongo.config';

type SaveGameLogOptions = {
  readonly chatId: number;
  readonly gameId: string;
  readonly type: string;
  readonly correct: string;
};

type UpdateGameLogOptions = {
  readonly chatId: number;
  readonly gameId: string;
  readonly selected: string;
};

@Injectable()
export class WorldlyMongoGameLogService {
  private readonly gameLogCollection: Collection<GameLog>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.gameLogCollection = this.db.collection(COLLECTIONS.GAME_LOG);
  }

  async saveGameLog({ chatId, gameId, type, correct }: SaveGameLogOptions): Promise<void> {
    const gameLog = {
      chatId,
      gameId,
      type,
      correct,
      createdAt: new Date(),
    } as GameLog;
    await this.gameLogCollection.insertOne(gameLog);
  }

  async updateGameLog({ chatId, gameId, selected }: UpdateGameLogOptions): Promise<void> {
    const filter = { chatId, gameId };
    const updateObj = { $set: { selected, answeredAt: new Date() } };
    await this.gameLogCollection.updateOne(filter, updateObj);
  }

  async getUserGameLogs(chatId: number): Promise<GameLog[]> {
    const filter = { chatId };
    return this.gameLogCollection.find(filter).toArray();
  }
}
