import { getMongoCollection } from '@core/mongo';
import { getRemindersByUser } from './reminder.repository';

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
