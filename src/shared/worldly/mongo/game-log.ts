import { getMongoCollection } from '@core/mongo';
import { GameLog } from '../types';
import { DB_NAME } from './constants';

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

const getCollection = () => getMongoCollection<GameLog>(DB_NAME, 'GameLog');

export async function saveGameLog({ chatId, gameId, type, correct }: SaveGameLogOptions): Promise<void> {
  const gameLogCollection = getCollection();
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
  const gameLogCollection = getCollection();
  const filter = { chatId, gameId };
  const updateObj = { $set: { selected, answeredAt: new Date() } };
  await gameLogCollection.updateOne(filter, updateObj);
}

export async function getUserGameLogs(chatId: number): Promise<GameLog[]> {
  const gameLogCollection = getCollection();
  const filter = { chatId };
  return gameLogCollection.find(filter).toArray();
}

export async function getTopByChatId(total: number): Promise<TopChatRecord[]> {
  const gameLogCollection = getCollection();
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
  const gameLogCollection = getCollection();
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
