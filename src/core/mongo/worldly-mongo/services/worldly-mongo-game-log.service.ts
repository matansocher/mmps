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

type TopChatRecord = {
  readonly chatId: number;
  readonly count: number;
  readonly records: GameLog[];
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

  async getTopByChatId(total: number): Promise<TopChatRecord[]> {
    const result = await this.gameLogCollection
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
    return result as TopChatRecord[];
  }

  async getGameLogsByUsers(): Promise<Record<string, GameLog[]>> {
    const logsByUsers = await this.gameLogCollection
      .aggregate([
        { $sort: { chatId: 1, createdAt: 1 } },
        {
          $group: {
            _id: '$chatId',
            logs: {
              $push: {
                correct: '$correct',
                selected: '$selected',
                createdAt: '$createdAt',
              },
            },
          },
        },
      ])
      .toArray();

    const gameLogsByUsers = {};
    logsByUsers.forEach(({ _id, logs }) => (gameLogsByUsers[_id] = logs));
    return gameLogsByUsers;
  }
}
