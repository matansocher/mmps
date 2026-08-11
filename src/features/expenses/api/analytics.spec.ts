import { ObjectId } from 'mongodb';
import type { Expense } from '@shared/expenses';
import { buildBaseline, enrichCategoryDeltas, getMonthBoundaries, parseSelectedMonth } from './analytics';

const expense = (date: string, amount: number, category: Expense['category'] = 'groceries', vendor = 'Store', currency = 'ILS'): Expense => ({
  _id: new ObjectId(),
  messageId: `${date}-${amount}`,
  type: 'card_alert',
  vendor,
  category,
  amount,
  currency,
  transactionDate: new Date(date),
  createdAt: new Date(date),
});

describe('month boundaries', () => {
  it('handles leap-month boundaries in the configured timezone', () => {
    const result = getMonthBoundaries('2024-02');
    expect(result.daysInMonth).toEqual(29);
    expect(result.start.toISOString()).toEqual('2024-01-31T22:00:00.000Z');
    expect(result.endExclusive.toISOString()).toEqual('2024-02-29T22:00:00.000Z');
  });

  it('preserves accepted month syntax and falls back for other values', () => {
    expect(() => parseSelectedMonth('2026-13', new Date('2026-08-11T12:00:00.000Z'))).toThrow();
    expect(parseSelectedMonth('all', new Date('2026-08-11T12:00:00.000Z')).ym).toEqual('2026-08');
  });
});

describe('baseline analytics', () => {
  it('averages only populated prior months and limits to-date totals by day', () => {
    const baseline = buildBaseline(
      [
        expense('2026-07-05T09:00:00.000Z', 100),
        expense('2026-07-20T09:00:00.000Z', 200),
        expense('2026-06-05T09:00:00.000Z', 50),
        expense('2026-06-20T09:00:00.000Z', 150),
        expense('2026-05-05T09:00:00.000Z', 999, 'groceries', 'Store', 'USD'),
      ],
      '2026-08',
      10,
      'ILS',
    );

    expect(baseline.monthCount).toEqual(2);
    expect(baseline.avgFullMonthTotal).toEqual(250);
    expect(baseline.avgToDateTotal).toEqual(75);
    expect(baseline.byCategoryAvg.get('groceries')).toEqual(250);
    expect(baseline.byCategoryMonthsPresent.get('groceries')).toEqual(2);
  });

  it('shows percentages only with at least two comparable historic months', () => {
    const current = [expense('2026-08-05T09:00:00.000Z', 300)];
    const comparable = buildBaseline([expense('2026-07-05T09:00:00.000Z', 100), expense('2026-06-05T09:00:00.000Z', 200)], '2026-08', 31, 'ILS');
    const sparse = buildBaseline([expense('2026-07-05T09:00:00.000Z', 100)], '2026-08', 31, 'ILS');

    expect(enrichCategoryDeltas(current, comparable, 'ILS')[0]).toMatchObject({ comparableHistoricAvg: 150, percentVsHistoric: 100 });
    expect(enrichCategoryDeltas(current, sparse, 'ILS')[0]).toMatchObject({ comparableHistoricAvg: 100, percentVsHistoric: null });
  });
});
