import { describe, expect, it } from 'vitest';
import { createRun } from '../../../../src/features/hells-kitchen/game/engine';
import type { Dish, Run } from '../../../../src/features/hells-kitchen/game/types';
import { neededIngredients, nextStep } from './guide';
import { bowlRect, GREET_RECT, NAV_RECTS, panRect, tableRect } from './layout';

const dish = (id: number, recipeId: number, patch: Partial<Dish> = {}): Dish => ({ id, recipeId, loaded: [], state: 'raw', elapsed: 0, quality: 5, ...patch });

function withOrder(run: Run, dishes: readonly Dish[], patch: Partial<Run> = {}): Run {
  const tables = run.tables.map((t) => (t.id === 0 ? { ...t, stage: 'waiting' as const, guests: dishes.length } : t));
  return { ...run, view: 'blue', tables, orders: [{ id: 50, tableId: 0, kitchen: 'blue', dishes }], selectedOrder: 50, ...patch };
}

describe('nextStep()', () => {
  const base = createRun(2, 'career', 7, 'guide');

  it('should point at reception when guests are waiting', () => {
    expect(nextStep({ ...base, waiting: 1 }, null)).toEqual(expect.objectContaining({ title: 'Greet your guests', target: GREET_RECT }));
  });

  it('should point at a table that is ready to order', () => {
    const run = { ...base, tables: base.tables.map((t) => (t.id === 1 ? { ...t, stage: 'order' as const, guests: 2 } : t)) };
    expect(nextStep(run, null)).toEqual(expect.objectContaining({ title: 'Take table 2’s order', target: tableRect(1) }));
  });

  it('should send the player to the kitchen when a dish is ready', () => {
    const run = { ...withOrder(base, [dish(1, 0, { state: 'ready', loaded: ['grain', 'vegetables'] })]), view: 'dining' as const };
    expect(nextStep(run, null).target).toEqual(NAV_RECTS.blue);
  });

  it('should ask to prep an ingredient for the slowest dish first', () => {
    // Pan-seared chicken (13s) should be started before garden risotto (9s).
    const run = withOrder(base, [dish(1, 0), dish(2, 1)]);
    expect(nextStep(run, null)).toEqual(expect.objectContaining({ title: 'Prep the Poultry', target: bowlRect(2) }));
  });

  it('should ask to pick up a prepared bowl and then drop it into the right pan', () => {
    const run = withOrder(base, [dish(1, 0), dish(2, 1)], { bowls: { ...base.bowls, grain: true } });
    expect(nextStep(run, null)).toEqual(expect.objectContaining({ title: 'Pick up the Grains', target: bowlRect(1) }));
    expect(nextStep(run, 'grain')).toEqual(expect.objectContaining({ title: 'Add the Grains', target: panRect(0) }));
  });

  it('should warn when the held ingredient is not needed', () => {
    const run = withOrder(base, [dish(1, 0)], { bowls: { ...base.bowls, fish: true } });
    expect(nextStep(run, 'fish').target).toEqual(bowlRect(3));
  });

  it('should point at a ready pan', () => {
    const run = withOrder(base, [dish(1, 0, { state: 'cooking', loaded: ['grain', 'vegetables'] }), dish(2, 1, { state: 'ready', loaded: ['chicken', 'vegetables'] })]);
    expect(nextStep(run, null)).toEqual(expect.objectContaining({ title: 'Take it off the heat!', target: panRect(1) }));
  });

  it('should send a completed order to the dining room', () => {
    const run = withOrder(base, [dish(1, 0, { state: 'plated', loaded: ['grain', 'vegetables'] })]);
    expect(nextStep(run, null)).toEqual(expect.objectContaining({ title: 'Serve table 1', target: NAV_RECTS.dining }));
  });

  it('should move on once the waiter is already serving the order', () => {
    const run = withOrder(base, [dish(1, 0, { state: 'plated', loaded: ['grain', 'vegetables'] })], { waiterQueue: [{ target: 0, action: 'serve' }] });
    expect(nextStep(run, null).title).not.toEqual('Serve table 1');
  });
});

describe('neededIngredients()', () => {
  it('should count what open raw dishes still need', () => {
    const run = withOrder(createRun(2, 'career', 7, 'guide'), [dish(1, 0, { loaded: ['grain'] }), dish(2, 1)]);
    expect(neededIngredients(run, 'blue')).toEqual({ vegetables: 2, grain: 0, chicken: 1, fish: 0, beef: 0, dairy: 0, fruit: 0 });
  });
});
