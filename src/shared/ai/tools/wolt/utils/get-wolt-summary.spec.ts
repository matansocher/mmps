import { getTopBy, getUserDetails } from '@shared/wolt';
import { getWoltSummary } from './get-wolt-summary';

vi.mock('@shared/wolt', () => ({ getTopBy: vi.fn(), getUserDetails: vi.fn() }));

describe('getWoltSummary()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-08T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should count only alerts from the last 7 days', async () => {
    vi.mocked(getTopBy).mockResolvedValue([]);

    await getWoltSummary();

    expect(getTopBy).toHaveBeenCalledWith('chatId', new Date('2024-01-01T10:00:00Z'));
    expect(getTopBy).toHaveBeenCalledWith('restaurant', new Date('2024-01-01T10:00:00Z'));
  });

  it('should format users without printing missing name parts', async () => {
    vi.mocked(getTopBy).mockImplementation(async (topBy) =>
      topBy === 'chatId'
        ? [
            { _id: 1, count: 3 },
            { _id: 2, count: 2 },
            { _id: 3, count: 1 },
          ]
        : [{ _id: 'Pizza', count: 4 }],
    );
    vi.mocked(getUserDetails).mockImplementation(async (chatId) => {
      if (chatId === 1) return { firstName: 'Dana', lastName: 'Levi', username: 'dana' } as never;
      if (chatId === 2) return { firstName: 'Avi' } as never;
      return null;
    });

    const summary = await getWoltSummary();

    expect(summary).toEqual('Top users in the last 7 days:\n1. Dana Levi - dana (3)\n2. Avi (2)\n3. Unknown User (1)\n\nTop restaurants in the last 7 days:\n1. Pizza (4)');
    expect(summary).not.toContain('undefined');
  });

  it('should say when there were no alerts', async () => {
    vi.mocked(getTopBy).mockResolvedValue([]);

    expect(await getWoltSummary()).toEqual('Top users in the last 7 days:\nNo alerts\n\nTop restaurants in the last 7 days:\nNo alerts');
  });
});
