import type { ExpenseCategory } from '../types';

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  restaurants: '🍽️',
  fast_food: '🍔',
  groceries: '🛒',
  fuel: '⛽',
  transport: '🚗',
  home: '🛋️',
  shopping: '🛍️',
  health: '💊',
  entertainment: '🎬',
  events: '🎉',
  travel: '✈️',
  communications: '📡',
  insurance: '🛡️',
  government: '🏛️',
  subscriptions: '📅',
  utilities: '💡',
  bills: '🧾',
  transfer: '💸',
  electronics: '💻',
  books: '📚',
  other: '💳',
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  restaurants: 'Restaurants',
  fast_food: 'Fast food',
  groceries: 'Groceries',
  fuel: 'Fuel',
  transport: 'Transport',
  home: 'Home',
  shopping: 'Shopping',
  health: 'Health',
  entertainment: 'Entertainment',
  events: 'Events',
  travel: 'Travel',
  communications: 'Comms',
  insurance: 'Insurance',
  government: 'Gov',
  subscriptions: 'Subs',
  utilities: 'Utilities',
  bills: 'Bills',
  transfer: 'Transfer',
  electronics: 'Electronics',
  books: 'Books',
  other: 'Other',
};

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category as ExpenseCategory] ?? '💳';
}
