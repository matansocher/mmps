import { Collection, Db } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { GameLog } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../quizzy-mongo.config';

@Injectable()
export class QuizzyMongoGameLogService {
  private readonly gameLogCollection: Collection<GameLog>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.gameLogCollection = this.db.collection(COLLECTIONS.GAME_LOG);
  }

  async saveGameLog(chatId: number, question: string, correct: string = null, selected: string = null): Promise<void> {
    const gameLog = {
      chatId,
      question,
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

  async getTopByChatId(total: number) {
    return this.gameLogCollection
      .aggregate([
        {
          $group: {
            _id: '$chatId',
            count: { $sum: 1 },
            records: { $push: '$$ROOT' }, // Push full documents
          },
        },
        { $sort: { count: -1 } },
        { $limit: total },
        {
          $project: {
            _id: 0,
            chatId: '$_id',
            count: 1,
            records: 1,
          },
        },
      ])
      .toArray();
  }
}
