import { Collection, Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { GameLog } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../worldly-mongo.config';

@Injectable()
export class WorldlyMongoGameLogService {
  private readonly gameLogCollection: Collection<GameLog>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.gameLogCollection = this.db.collection(COLLECTIONS.GAME_LOG);
  }

  async saveGameLog(chatId: number, type: string, correct: string = null, selected: string = null): Promise<void> {
    const gameLog = {
      chatId,
      type,
      correct,
      selected,
      createdAt: new Date(),
    } as GameLog;
    await this.gameLogCollection.insertOne(gameLog);
  }

  async getUserGameLogs(chatId: number): Promise<GameLog[]> {
    const filter = { chatId };
    return this.gameLogCollection.find(filter).toArray();
  }
}
