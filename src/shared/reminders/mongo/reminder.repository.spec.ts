import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMongoCollection } from '@core/mongo';
import { deleteReminder, getReminderById, getRemindersByUser, updateReminder } from './reminder.repository';

vi.mock('@core/mongo', () => ({
  getMongoCollection: vi.fn(),
}));

describe('getRemindersByUser()', () => {
  const toArray = vi.fn();
  const sort = vi.fn(() => ({ toArray }));
  const find = vi.fn(() => ({ sort }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ find } as never);
    toArray.mockResolvedValue([]);
  });

  it('should query only pending and snoozed reminders by default', async () => {
    await getRemindersByUser(123);

    expect(find).toHaveBeenCalledWith({
      chatId: 123,
      status: { $in: ['pending', 'snoozed'] },
    });
    expect(sort).toHaveBeenCalledWith({ dueDate: 1 });
  });

  it('should query all reminder statuses when completed reminders are included', async () => {
    await getRemindersByUser(123, true);

    expect(find).toHaveBeenCalledWith({ chatId: 123 });
    expect(sort).toHaveBeenCalledWith({ dueDate: 1 });
  });
});

describe('reminder repository ObjectId handling', () => {
  const findOne = vi.fn();
  const updateOne = vi.fn();
  const deleteOne = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoCollection).mockReturnValue({ findOne, updateOne, deleteOne } as never);
    findOne.mockResolvedValue(null);
    updateOne.mockResolvedValue({ modifiedCount: 1 });
    deleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it('converts a string id for read operations', async () => {
    const id = new ObjectId();

    await getReminderById(id.toHexString(), 123);

    expect(findOne).toHaveBeenCalledWith({ _id: id, chatId: 123 });
  });

  it('accepts ObjectId inputs for update and delete operations', async () => {
    const id = new ObjectId();

    await expect(updateReminder(id, 123, { message: 'Updated' })).resolves.toEqual(true);
    await expect(deleteReminder(id, 123)).resolves.toEqual(true);

    expect(updateOne).toHaveBeenCalledWith({ _id: id, chatId: 123 }, { $set: { message: 'Updated' } });
    expect(deleteOne).toHaveBeenCalledWith({ _id: id, chatId: 123 });
  });
});
