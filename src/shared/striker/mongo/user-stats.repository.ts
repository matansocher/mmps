import { getMongoCollection } from '@core/mongo';
import { TopPlayerRecord, UserStats } from '../types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<UserStats>(DB_NAME, 'UserStats');

export async function getUserStats(chatId: number): Promise<UserStats | null> {
  const userStatsCollection = getCollection();
  return userStatsCollection.findOne({ chatId });
}

export async function createUserStats(chatId: number): Promise<void> {
  const userStatsCollection = getCollection();
  const userStats: UserStats = {
    chatId,
    totalGames: 0,
    correctGuesses: 0,
    totalScore: 0,
    averageHintsUsed: 0,
    bestStreak: 0,
    currentStreak: 0,
    lastPlayedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await userStatsCollection.insertOne(userStats);
}

export async function updateUserStats(
  chatId: number,
  updates: {
    isCorrect: boolean;
    hintsUsed: number;
    score: number;
  },
): Promise<void> {
  const userStatsCollection = getCollection();
  const user = await getUserStats(chatId);

  if (!user) {
    await createUserStats(chatId);
  }

  const { isCorrect, hintsUsed, score } = updates;

  const newStreak = isCorrect ? (user?.currentStreak || 0) + 1 : 0;
  const bestStreak = Math.max(user?.bestStreak || 0, newStreak);

  const totalGames = (user?.totalGames || 0) + 1;
  const previousTotalHints = (user?.averageHintsUsed || 0) * (user?.totalGames || 0);
  const newAverageHints = (previousTotalHints + hintsUsed) / totalGames;

  const updateObj = {
    $inc: {
      totalGames: 1,
      correctGuesses: isCorrect ? 1 : 0,
      totalScore: score,
    },
    $set: {
      currentStreak: newStreak,
      bestStreak: bestStreak,
      averageHintsUsed: newAverageHints,
      lastPlayedAt: new Date(),
      updatedAt: new Date(),
    },
  };

  await userStatsCollection.updateOne({ chatId }, updateObj, { upsert: true });
}

export async function getLeaderboard(limit: number = 10): Promise<TopPlayerRecord[]> {
  const userStatsCollection = getCollection();
  const result = await userStatsCollection
    .aggregate([
      {
        $match: {
          totalGames: { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: 'User',
          localField: 'chatId',
          foreignField: 'chatId',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          winRate: {
            $multiply: [{ $divide: ['$correctGuesses', '$totalGames'] }, 100],
          },
          username: '$user.username',
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          chatId: 1,
          username: 1,
          totalScore: 1,
          totalGames: 1,
          correctGuesses: 1,
          winRate: 1,
        },
      },
    ])
    .toArray();

  return result as TopPlayerRecord[];
}
