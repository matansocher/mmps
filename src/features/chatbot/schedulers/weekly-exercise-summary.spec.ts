import type { Bot } from 'grammy';
import { sendRichMessage } from '@services/telegram';
import { getWeeklyExerciseStats, type WeeklyExerciseStats } from '@shared/trainer';
import { weeklyExerciseSummary } from './weekly-exercise-summary';

vi.mock('@services/telegram', () => ({ sendRichMessage: vi.fn() }));
vi.mock('@shared/trainer', () => ({ getWeeklyExerciseStats: vi.fn() }));

const bot = {} as unknown as Bot;

function createStats(overrides: Partial<WeeklyExerciseStats> = {}): WeeklyExerciseStats {
  return {
    weekStart: new Date('2026-08-09T00:00:00'),
    weekEnd: new Date('2026-08-15T23:59:59'),
    exerciseCount: 3,
    exercisedWeekdays: [1, 3, 5],
    currentStreak: 2,
    longestStreak: 9,
    ...overrides,
  };
}

function sentMessage(): string {
  return vi.mocked(sendRichMessage).mock.calls[0][2];
}

describe('weeklyExerciseSummary()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWeeklyExerciseStats).mockResolvedValue(createStats());
  });

  it('should send the summary as a rich message so tables render', async () => {
    await weeklyExerciseSummary(bot);
    expect(sendRichMessage).toHaveBeenCalledTimes(1);
  });

  it('should include the week date range in the header', async () => {
    await weeklyExerciseSummary(bot);
    expect(sentMessage()).toContain('(09/08 - 15/08)');
  });

  it('should mark exercised days and leave the rest empty', async () => {
    await weeklyExerciseSummary(bot);
    expect(sentMessage()).toContain('| — | ✅ | — | ✅ | — | ✅ | — |');
  });

  it('should render the stats as a table', async () => {
    await weeklyExerciseSummary(bot);
    const message = sentMessage();
    expect(message).toContain('| Workouts | 3 |');
    expect(message).toContain('| Current streak | 2 |');
    expect(message).toContain('| Longest streak | 9 |');
  });

  it('should render the rating as stars', async () => {
    await weeklyExerciseSummary(bot);
    expect(sentMessage()).toContain('| Rating | ★★★☆☆ |');
  });

  it('should still send a summary for a week with no exercises', async () => {
    vi.mocked(getWeeklyExerciseStats).mockResolvedValue(createStats({ exerciseCount: 0, exercisedWeekdays: [], currentStreak: 0 }));
    await weeklyExerciseSummary(bot);
    const message = sentMessage();
    expect(message).toContain('| Workouts | 0 |');
    expect(message).not.toContain('✅');
  });

  it('should not throw when fetching stats fails', async () => {
    vi.mocked(getWeeklyExerciseStats).mockRejectedValue(new Error('mongo down'));
    await expect(weeklyExerciseSummary(bot)).resolves.toBeUndefined();
    expect(sendRichMessage).not.toHaveBeenCalled();
  });
});
