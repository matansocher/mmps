import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startMongoContainer, clearCollection, stopMongoContainer } from './helpers/mongo-container';
import { saveGameLog, updateGameLog, getUserGameLogs, getTopByChatId, getGameLogsByUsers } from '@shared/worldly/mongo/game-log';

const DB_NAME = 'Worldly';
const COLLECTION_NAME = 'GameLog';

describe('worldly game-log repository', () => {
  beforeAll(async () => {
    await startMongoContainer(DB_NAME);
  }, 30_000);

  afterEach(async () => {
    await clearCollection(DB_NAME, COLLECTION_NAME);
  });

  afterAll(async () => {
    await stopMongoContainer();
  });

  describe('saveGameLog', () => {
    it('should insert a game log entry', async () => {
      await saveGameLog({ chatId: 1, gameId: 'game-1', type: 'flag', correct: 'Israel' });

      const logs = await getUserGameLogs(1);
      expect(logs).toHaveLength(1);
      expect(logs[0].gameId).toBe('game-1');
      expect(logs[0].type).toBe('flag');
      expect(logs[0].correct).toBe('Israel');
    });
  });

  describe('updateGameLog', () => {
    it('should set the selected answer and answeredAt timestamp', async () => {
      await saveGameLog({ chatId: 1, gameId: 'game-2', type: 'capital', correct: 'Paris' });

      await updateGameLog({ chatId: 1, gameId: 'game-2', selected: 'Paris' });

      const logs = await getUserGameLogs(1);
      expect(logs[0].selected).toBe('Paris');
      expect(logs[0].answeredAt).toBeDefined();
    });
  });

  describe('getUserGameLogs', () => {
    it('should return only logs for the specified user', async () => {
      await saveGameLog({ chatId: 1, gameId: 'g1', type: 'flag', correct: 'A' });
      await saveGameLog({ chatId: 2, gameId: 'g2', type: 'flag', correct: 'B' });
      await saveGameLog({ chatId: 1, gameId: 'g3', type: 'capital', correct: 'C' });

      const logs = await getUserGameLogs(1);

      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.chatId === 1)).toBe(true);
    });
  });

  describe('getTopByChatId', () => {
    it('should return top users by game count', async () => {
      // User 10 plays 3 games
      await saveGameLog({ chatId: 10, gameId: 'a1', type: 'flag', correct: 'X' });
      await saveGameLog({ chatId: 10, gameId: 'a2', type: 'flag', correct: 'Y' });
      await saveGameLog({ chatId: 10, gameId: 'a3', type: 'flag', correct: 'Z' });
      // User 20 plays 1 game
      await saveGameLog({ chatId: 20, gameId: 'b1', type: 'flag', correct: 'A' });
      // User 30 plays 2 games
      await saveGameLog({ chatId: 30, gameId: 'c1', type: 'flag', correct: 'B' });
      await saveGameLog({ chatId: 30, gameId: 'c2', type: 'flag', correct: 'C' });

      const top = await getTopByChatId(2);

      expect(top).toHaveLength(2);
      expect(top[0].chatId).toBe(10);
      expect(top[0].count).toBe(3);
      expect(top[1].chatId).toBe(30);
      expect(top[1].count).toBe(2);
    });

    it('should include full records in the result', async () => {
      await saveGameLog({ chatId: 5, gameId: 'x1', type: 'capital', correct: 'Rome' });

      const top = await getTopByChatId(1);

      expect(top[0].records).toHaveLength(1);
      expect(top[0].records[0].correct).toBe('Rome');
    });
  });

  describe('getGameLogsByUsers', () => {
    it('should group game logs by chatId', async () => {
      await saveGameLog({ chatId: 1, gameId: 'g1', type: 'flag', correct: 'A' });
      await updateGameLog({ chatId: 1, gameId: 'g1', selected: 'A' });
      await saveGameLog({ chatId: 1, gameId: 'g2', type: 'flag', correct: 'B' });
      await updateGameLog({ chatId: 1, gameId: 'g2', selected: 'C' });
      await saveGameLog({ chatId: 2, gameId: 'g3', type: 'flag', correct: 'D' });
      await updateGameLog({ chatId: 2, gameId: 'g3', selected: 'D' });

      const logsByUsers = await getGameLogsByUsers();

      expect(Object.keys(logsByUsers)).toHaveLength(2);
      expect(logsByUsers['1']).toHaveLength(2);
      expect(logsByUsers['2']).toHaveLength(1);
    });

    it('should include correct and selected fields in grouped results', async () => {
      await saveGameLog({ chatId: 7, gameId: 'g1', type: 'flag', correct: 'France' });
      await updateGameLog({ chatId: 7, gameId: 'g1', selected: 'Germany' });

      const logsByUsers = await getGameLogsByUsers();

      expect(logsByUsers['7'][0].correct).toBe('France');
      expect(logsByUsers['7'][0].selected).toBe('Germany');
    });
  });
});
