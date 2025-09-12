import { getCollection, getMongoDb } from '@core/mongo/shared';
import { GameLog } from '../models';
import { COLLECTIONS, DB_NAME } from '../worldly-mongo.config';

export type SaveGameLogOptions = {
  readonly chatId: number;
  readonly gameId: string;
  readonly type: string;
  readonly correct: string;
};

export type UpdateGameLogOptions = {
  readonly chatId: number;
  readonly gameId: string;
  readonly selected: string;
};

export type TopChatRecord = {
  readonly chatId: number;
  readonly count: number;
  readonly records: GameLog[];
};

export async function saveGameLog({ chatId, gameId, type, correct }: SaveGameLogOptions): Promise<void> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<GameLog>(db, COLLECTIONS.GAME_LOG);

  const gameLog = {
    chatId,
    gameId,
    type,
    correct,
    createdAt: new Date(),
  } as GameLog;
  await collection.insertOne(gameLog);
}

export async function updateGameLog({ chatId, gameId, selected }: UpdateGameLogOptions): Promise<void> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<GameLog>(db, COLLECTIONS.GAME_LOG);

  const filter = { chatId, gameId };
  const updateObj = { $set: { selected, answeredAt: new Date() } };
  await collection.updateOne(filter, updateObj);
}

export async function getUserGameLogs(chatId: number): Promise<GameLog[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<GameLog>(db, COLLECTIONS.GAME_LOG);

  const filter = { chatId };
  return collection.find(filter).toArray();
}

export async function getTopByChatId(total: number): Promise<TopChatRecord[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<GameLog>(db, COLLECTIONS.GAME_LOG);

  const result = await collection
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
