import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { startMongoContainer, clearCollection, stopMongoContainer } from './helpers/mongo-container';
import { createReminder, getDueReminders, getRemindersByUser, getReminderById, updateReminderStatus, updateReminder, deleteReminder, getPendingReminderCount, reactivateSnoozedReminders } from '@shared/reminders/mongo/reminder.repository';

const DB_NAME = 'Reminders';
const COLLECTION_NAME = 'Reminders';
const CHAT_ID = 12345;

describe('reminders repository', () => {
  beforeAll(async () => {
    await startMongoContainer(DB_NAME);
  }, 30_000);

  afterEach(async () => {
    await clearCollection(DB_NAME, COLLECTION_NAME);
  });

  afterAll(async () => {
    await stopMongoContainer();
  });

  describe('createReminder', () => {
    it('should insert a reminder and return an id', async () => {
      const result = await createReminder({
        chatId: CHAT_ID,
        message: 'Buy groceries',
        dueDate: new Date('2026-06-01T10:00:00Z'),
      });

      expect(result.insertedId).toBeDefined();
      expect(result.acknowledged).toBe(true);
    });
  });

  describe('getRemindersByUser', () => {
    it('should return only reminders for the given chatId', async () => {
      await createReminder({ chatId: CHAT_ID, message: 'Task 1', dueDate: new Date() });
      await createReminder({ chatId: CHAT_ID, message: 'Task 2', dueDate: new Date() });
      await createReminder({ chatId: 99999, message: 'Other user', dueDate: new Date() });

      const reminders = await getRemindersByUser(CHAT_ID);

      expect(reminders).toHaveLength(2);
      expect(reminders.every((r) => r.chatId === CHAT_ID)).toBe(true);
    });

    it('should exclude completed reminders by default', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Done task', dueDate: new Date() });
      await updateReminderStatus(insertedId, CHAT_ID, 'completed');

      const reminders = await getRemindersByUser(CHAT_ID);

      expect(reminders).toHaveLength(0);
    });

    it('should include completed reminders when includeCompleted is true', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Done task', dueDate: new Date() });
      await updateReminderStatus(insertedId, CHAT_ID, 'completed');

      const reminders = await getRemindersByUser(CHAT_ID, true);

      expect(reminders).toHaveLength(1);
      expect(reminders[0].status).toBe('completed');
    });
  });

  describe('getDueReminders', () => {
    it('should return only past-due pending reminders', async () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const futureDate = new Date('2030-01-01T00:00:00Z');

      await createReminder({ chatId: CHAT_ID, message: 'Past due', dueDate: pastDate });
      await createReminder({ chatId: CHAT_ID, message: 'Future', dueDate: futureDate });

      const due = await getDueReminders();

      expect(due).toHaveLength(1);
      expect(due[0].message).toBe('Past due');
    });
  });

  describe('getReminderById', () => {
    it('should return the reminder matching id and chatId', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Find me', dueDate: new Date() });

      const reminder = await getReminderById(insertedId, CHAT_ID);

      expect(reminder).not.toBeNull();
      expect(reminder!.message).toBe('Find me');
    });

    it('should return null for wrong chatId', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Secret', dueDate: new Date() });

      const reminder = await getReminderById(insertedId, 99999);

      expect(reminder).toBeNull();
    });
  });

  describe('updateReminderStatus', () => {
    it('should mark a reminder as completed with timestamp', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Complete me', dueDate: new Date() });

      const updated = await updateReminderStatus(insertedId, CHAT_ID, 'completed');

      expect(updated).toBe(true);

      const reminder = await getReminderById(insertedId, CHAT_ID);
      expect(reminder!.status).toBe('completed');
      expect(reminder!.completedAt).toBeDefined();
    });

    it('should mark a reminder as snoozed with snoozedUntil', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Snooze me', dueDate: new Date() });
      const snoozeUntil = new Date('2026-06-01T12:00:00Z');

      const updated = await updateReminderStatus(insertedId, CHAT_ID, 'snoozed', snoozeUntil);

      expect(updated).toBe(true);

      const reminder = await getReminderById(insertedId, CHAT_ID);
      expect(reminder!.status).toBe('snoozed');
      expect(reminder!.snoozedUntil).toEqual(snoozeUntil);
    });
  });

  describe('updateReminder', () => {
    it('should update message and dueDate', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Original', dueDate: new Date() });
      const newDate = new Date('2026-07-01T10:00:00Z');

      const updated = await updateReminder(insertedId, CHAT_ID, { message: 'Updated', dueDate: newDate });

      expect(updated).toBe(true);

      const reminder = await getReminderById(insertedId, CHAT_ID);
      expect(reminder!.message).toBe('Updated');
      expect(reminder!.dueDate).toEqual(newDate);
    });
  });

  describe('deleteReminder', () => {
    it('should delete the reminder and return true', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Delete me', dueDate: new Date() });

      const deleted = await deleteReminder(insertedId, CHAT_ID);

      expect(deleted).toBe(true);

      const reminder = await getReminderById(insertedId, CHAT_ID);
      expect(reminder).toBeNull();
    });

    it('should return false for non-existent reminder', async () => {
      const { ObjectId } = await import('mongodb');
      const deleted = await deleteReminder(new ObjectId(), CHAT_ID);

      expect(deleted).toBe(false);
    });
  });

  describe('getPendingReminderCount', () => {
    it('should count only pending and snoozed reminders', async () => {
      await createReminder({ chatId: CHAT_ID, message: 'Pending 1', dueDate: new Date() });
      await createReminder({ chatId: CHAT_ID, message: 'Pending 2', dueDate: new Date() });
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Completed', dueDate: new Date() });
      await updateReminderStatus(insertedId, CHAT_ID, 'completed');

      const count = await getPendingReminderCount(CHAT_ID);

      expect(count).toBe(2);
    });
  });

  describe('reactivateSnoozedReminders', () => {
    it('should reactivate snoozed reminders whose snoozedUntil has passed', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Snoozed', dueDate: new Date() });
      const pastSnooze = new Date('2020-01-01T00:00:00Z');
      await updateReminderStatus(insertedId, CHAT_ID, 'snoozed', pastSnooze);

      const reactivatedCount = await reactivateSnoozedReminders();

      expect(reactivatedCount).toBe(1);

      const reminder = await getReminderById(insertedId, CHAT_ID);
      expect(reminder!.status).toBe('pending');
    });

    it('should not reactivate snoozed reminders whose snoozedUntil is in the future', async () => {
      const { insertedId } = await createReminder({ chatId: CHAT_ID, message: 'Future snooze', dueDate: new Date() });
      const futureSnooze = new Date('2030-01-01T00:00:00Z');
      await updateReminderStatus(insertedId, CHAT_ID, 'snoozed', futureSnooze);

      const reactivatedCount = await reactivateSnoozedReminders();

      expect(reactivatedCount).toBe(0);
    });
  });
});
