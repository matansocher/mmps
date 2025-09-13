import { Collection, Db } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared';
import { GameLog } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let gameLogCollection: Collection<GameLog>;

(async () => {
  db = await getMongoDb(DB_NAME);
  gameLogCollection = getCollection<GameLog>(db, COLLECTIONS.GAME_LOG);
})();

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
  const gameLog = {
    chatId,
    gameId,
    type,
    correct,
    createdAt: new Date(),
  } as GameLog;
  await gameLogCollection.insertOne(gameLog);
}

export async function updateGameLog({ chatId, gameId, selected }: UpdateGameLogOptions): Promise<void> {
  const filter = { chatId, gameId };
  const updateObj = { $set: { selected, answeredAt: new Date() } };
  await gameLogCollection.updateOne(filter, updateObj);
}

export async function getUserGameLogs(chatId: number): Promise<GameLog[]> {
  const filter = { chatId };
  return gameLogCollection.find(filter).toArray();
}

export async function getTopByChatId(total: number): Promise<TopChatRecord[]> {
  const result = await gameLogCollection
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

export async function getGameLogsByUsers(): Promise<Record<string, GameLog[]>> {
  const logsByUsers = await gameLogCollection
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
