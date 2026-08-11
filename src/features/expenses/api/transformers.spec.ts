import { ObjectId } from 'mongodb';
import type { Expense } from '@shared/expenses';
import { buildVendorDetail, categoryBreakdown, computeTopCharges, pickPrimaryCurrency, toExpenseDto, typeBreakdown } from './transformers';

const expense = (overrides: Partial<Expense> = {}): Expense => ({
  _id: new ObjectId(),
  messageId: 'message-1',
  type: 'card_alert',
  vendor: 'Raw vendor',
  category: 'other',
  amount: 10,
  currency: 'ILS',
  transactionDate: new Date('2026-08-11T09:00:00.000Z'),
  createdAt: new Date('2026-08-11T09:00:00.000Z'),
  ...overrides,
});

describe('toExpenseDto()', () => {
  it('maps effective values while exposing changed originals', () => {
    const source = expense({ userVendor: 'Friendly vendor', userCategory: 'groceries', userType: 'receipt', notes: 'Weekly shop' });

    expect(toExpenseDto(source)).toEqual({
      id: source._id!.toString(),
      vendor: 'Friendly vendor',
      category: 'groceries',
      amount: 10,
      currency: 'ILS',
      type: 'receipt',
      transactionDate: '2026-08-11T09:00:00.000Z',
      notes: 'Weekly shop',
      originalVendor: 'Raw vendor',
      originalCategory: 'other',
      originalType: 'card_alert',
    });
  });
});

describe('expense summaries', () => {
  it('groups effective categories and types by currency with two-decimal rounding', () => {
    const expenses = [
      expense({ amount: 10.005, userCategory: 'groceries', userType: 'receipt' }),
      expense({ amount: 4.004, userCategory: 'groceries', userType: 'receipt' }),
      expense({ amount: 20, currency: 'USD', category: 'travel' }),
    ];

    expect(categoryBreakdown(expenses)).toEqual([
      { category: 'travel', currency: 'USD', total: 20, count: 1 },
      { category: 'groceries', currency: 'ILS', total: 14.01, count: 2 },
    ]);
    expect(typeBreakdown(expenses)).toEqual([
      { type: 'card_alert', currency: 'USD', total: 20, count: 1 },
      { type: 'receipt', currency: 'ILS', total: 14.01, count: 2 },
    ]);
  });

  it('uses summed amounts for primary currency and maps sorted top charges', () => {
    const first = expense({ amount: 40, userVendor: 'Override', card: '1234' });
    const second = expense({ amount: 30 });
    const usd = expense({ amount: 60, currency: 'USD' });

    expect(pickPrimaryCurrency([first, second, usd])).toEqual('ILS');
    expect(computeTopCharges([first, second], 1)).toEqual([
      {
        id: first._id!.toString(),
        vendor: 'Override',
        amount: 40,
        currency: 'ILS',
        transactionDate: '2026-08-11T09:00:00.000Z',
        category: 'other',
        card: '1234',
      },
    ]);
  });

  it('returns an empty vendor detail without inventing transactions', () => {
    expect(buildVendorDetail('Missing', [])).toMatchObject({
      vendor: 'Missing',
      currency: 'ILS',
      total: 0,
      count: 0,
      avg: 0,
      firstDate: null,
      lastDate: null,
      totals: [],
      dominantCategory: null,
      expenses: [],
    });
  });
});
