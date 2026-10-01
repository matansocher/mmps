import { describe, expect, it } from 'vitest';
import { createRun } from '../../../../src/features/hells-kitchen/game/engine';
import type { Dish, Run } from '../../../../src/features/hells-kitchen/game/types';
import { neededIngredients, nextStep } from './guide';
import { potRect, RECEPTION_RECT, SWITCH_RECTS, tableRect } from './layout';

const dish = (id: number, recipeId: number, patch: Partial<Dish> = {}): Dish => ({ id, recipeId, loaded: [], state: 'raw', elapsed: 0, quality: 5, ...patch });

function withOrder(run: Run, dishes: readonly Dish[], patch: Partial<Run> = {}): Run {
  const tables = run.tables.map((t) => (t.id === 0 ? { ...t, stage: 'waiting' as const, guests: dishes.length } : t));
  return { ...run, view: 'blue', tables, orders: [{ id: 50, tableId: 0, kitchen: 'blue', dishes }], selectedOrder: 50, ...patch };
}

describe('nextStep()', () => {
  const base = createRun(2, 'career', 7, 'guide');

  it('should point at reception when guests are waiting', () => {
    expect(nextStep({ ...base, waiting: 1 }, null).target).toEqual(RECEPTION_RECT);
  });

  it('should point at a table that is ready to order', () => {
    const run = { ...base, tables: base.tables.map((t) => (t.id === 1 ? { ...t, stage: 'order' as const, guests: 2 } : t)) };
    expect(nextStep(run, null).target).toEqual(tableRect(1));
  });

  it('should send the player to the kitchen when a dish is ready', () => {
    const run = { ...withOrder(base, [dish(1, 0, { state: 'ready', loaded: ['grain', 'vegetables'] })]), view: 'dining' as const };
    expect(nextStep(run, null).target).toEqual(SWITCH_RECTS.dining);
  });

  it('should point at a ready pot', () => {
    const run = withOrder(base, [dish(1, 0, { state: 'cooking', loaded: ['grain', 'vegetables'] }), dish(2, 1, { state: 'ready', loaded: ['chicken', 'vegetables'] })]);
    expect(nextStep(run, null).target).toEqual(potRect(1));
  });
});

describe('neededIngredients()', () => {
  it('should count what open raw dishes still need', () => {
    const run = withOrder(createRun(2, 'career', 7, 'guide'), [dish(1, 0, { loaded: ['grain'] }), dish(2, 1)]);
    expect(neededIngredients(run, 'blue')).toEqual({ vegetables: 2, grain: 0, chicken: 1, fish: 0, beef: 0, dairy: 0, fruit: 0 });
  });
});
