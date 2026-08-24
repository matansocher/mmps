import { ObjectId } from 'mongodb';
import { parseJerusalemDate } from '@core/utils';
import { getReminderById, updateReminder } from '@shared/reminders';
import type { Reminder } from '@shared/reminders';
import { handleEditReminder } from './edit-reminder';

vi.mock('@core/utils', () => ({
  parseJerusalemDate: vi.fn(),
}));

vi.mock('@shared/reminders', () => ({
  getReminderById: vi.fn(),
  updateReminder: vi.fn(),
}));

describe('handleEditReminder()', () => {
  const reminder: Reminder = {
    _id: new ObjectId(),
    chatId: 123,
    message: 'Original reminder',
    dueDate: new Date('2030-01-01T10:00:00.000Z'),
    status: 'pending',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getReminderById).mockResolvedValue(reminder);
    vi.mocked(updateReminder).mockResolvedValue(true);
  });

  it('should pass only supported typed updates to the repository', async () => {
    const updatedDueDate = new Date('2031-01-01T10:00:00.000Z');
    vi.mocked(parseJerusalemDate).mockReturnValue(updatedDueDate);

    const result = JSON.parse(
      await handleEditReminder({
        chatId: 123,
        reminderId: reminder._id.toString(),
        message: 'Updated reminder',
        dueDate: '2031-01-01T12:00:00',
      }),
    );

    expect(updateReminder).toHaveBeenCalledWith(reminder._id.toString(), 123, {
      message: 'Updated reminder',
      dueDate: updatedDueDate,
    });
    expect(result).toEqual({
      success: true,
      message: 'Reminder updated successfully',
      reminder: {
        id: reminder._id.toString(),
        message: 'Updated reminder',
        dueDate: updatedDueDate.toISOString(),
      },
    });
  });

  it('should reject invalid due dates without updating the reminder', async () => {
    vi.mocked(parseJerusalemDate).mockReturnValue(new Date(Number.NaN));

    const result = JSON.parse(
      await handleEditReminder({
        chatId: 123,
        reminderId: reminder._id.toString(),
        dueDate: 'invalid',
      }),
    );

    expect(result).toEqual({
      success: false,
      error: 'Invalid date format. Please use ISO 8601 format',
    });
    expect(updateReminder).not.toHaveBeenCalled();
  });

  it('should reject edit requests without supported updates', async () => {
    const result = JSON.parse(
      await handleEditReminder({
        chatId: 123,
        reminderId: reminder._id.toString(),
      }),
    );

    expect(result).toEqual({
      success: false,
      error: 'No updates provided. Please specify message or dueDate to update',
    });
    expect(updateReminder).not.toHaveBeenCalled();
  });
});
