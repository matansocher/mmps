import { describe, expect, it } from 'vitest';
import { createOrderUpState, createOrderWave, INGREDIENTS, matchesOrder, ORDER_UP_WAVES, orderDifficulty, orderUpReducer, orderUpResult, updatedIngredients } from './order-up';
import type { Ingredient, OrderUpState, OrderWave } from './order-up';

function begin(waves: readonly OrderWave[] = [createOrderWave(0, () => 0.5)]): OrderUpState {
  const state = orderUpReducer(createOrderUpState(waves), { type: 'start' });
  return orderUpReducer(state, { type: 'hide', wave: 0 });
}

function fill(state: OrderUpState, ingredients: readonly Ingredient[]): OrderUpState {
  return ingredients.reduce((current, ingredient) => orderUpReducer(current, { type: 'add', wave: current.waveIndex, customerId: current.selectedId, ingredient }), state);
}

describe('Order Up creation and difficulty', () => {
  it('introduces complexity gradually and gives more reveal time, not less', () => {
    expect(Array.from({ length: ORDER_UP_WAVES }, (_, index) => orderDifficulty(index).customers)).toEqual([1, 1, 2, 2, 2, 3]);
    expect(orderDifficulty(0)).toEqual({ customers: 1, length: 2, hasUpdate: false, revealSeconds: 8 });
    expect(orderDifficulty(5)).toEqual({ customers: 3, length: 3, hasUpdate: true, revealSeconds: 22 });
    expect(orderDifficulty(-1)).toEqual(orderDifficulty(0));
    expect(orderDifficulty(99)).toEqual(orderDifficulty(5));
  });

  it('creates deterministic unique ingredient lists and valid later updates', () => {
    for (let index = 0; index < ORDER_UP_WAVES; index++) {
      const wave = createOrderWave(index, () => 0.5);
      expect(wave).toEqual(createOrderWave(index, () => 0.5));
      expect(wave.orders).toHaveLength(orderDifficulty(index).customers);
      for (const order of wave.orders) {
        expect(new Set(order.ingredients).size).toEqual(orderDifficulty(index).length);
        expect(order.ingredients.every((ingredient) => INGREDIENTS.includes(ingredient))).toEqual(true);
      }
      expect(Boolean(wave.update)).toEqual(index >= 4);
      if (wave.update) {
        const target = wave.orders.find((order) => order.id === wave.update!.customerId)!;
        expect(target.ingredients).toContain(wave.update.from);
        expect(target.ingredients).not.toContain(wave.update.to);
        expect(updatedIngredients(target, wave.update).filter((value, position) => value !== target.ingredients[position])).toEqual([wave.update.to]);
        const other = wave.orders.find((order) => order.id !== target.id)!;
        expect(updatedIngredients(other, wave.update)).toEqual(other.ingredients);
      }
    }
  });
});

describe('Order Up sequence and lifecycle', () => {
  it('requires the exact ordered sequence, not a prefix, permutation, or superset', () => {
    expect(matchesOrder(['apple', 'pear'], ['apple', 'pear'])).toEqual(true);
    for (const draft of [[], ['apple'], ['pear', 'apple'], ['apple', 'pear', 'mint']] as Ingredient[][]) {
      expect(matchesOrder(['apple', 'pear'], draft)).toEqual(false);
    }
  });

  it('blocks play while watching and reveals the update only after watch ends', () => {
    const generated = createOrderWave(4, () => 0.5);
    const wave = { ...generated, index: 0 };
    let state = orderUpReducer(createOrderUpState([wave]), { type: 'start' });
    expect(fill(state, ['apple'])).toEqual(state);
    state = orderUpReducer(state, { type: 'tick', wave: 0, remaining: 3 });
    expect(state.phase).toEqual('watch');
    expect(state.remaining).toEqual(3);
    state = orderUpReducer(state, { type: 'tick', wave: 0, remaining: 0 });
    expect(state.phase).toEqual('update');
    expect(fill(state, ['apple'])).toEqual(state);
    state = orderUpReducer(state, { type: 'acknowledge', wave: 0 });
    expect(state.phase).toEqual('serve');
    const target = wave.orders.find((order) => order.id === wave.update!.customerId)!;
    state = orderUpReducer(state, { type: 'select', wave: 0, customerId: target.id });
    state = fill(state, updatedIngredients(target, wave.update));
    state = orderUpReducer(state, { type: 'serve', wave: 0, customerId: target.id });
    expect(state.completed).toEqual(1);
    expect(target.ingredients).not.toContain(wave.update!.to);
  });

  it('holds each draft across selections and clears only the failed customer', () => {
    const wave = { ...createOrderWave(2, () => 0.5), index: 0 };
    let state = begin([wave]);
    const [first, second] = wave.orders;
    state = fill(state, [first.ingredients[0]]);
    state = orderUpReducer(state, { type: 'select', wave: 0, customerId: second.id });
    state = fill(state, [second.ingredients[0]]);
    state = orderUpReducer(state, { type: 'select', wave: 0, customerId: first.id });
    expect(state.drafts[first.id]).toEqual([first.ingredients[0]]);
    state = fill(state, [first.ingredients[0]]);
    state = orderUpReducer(state, { type: 'serve', wave: 0, customerId: first.id });
    expect(state.phase).toEqual('serve');
    expect(state.attempted).toEqual(1);
    expect(state.completed).toEqual(0);
    expect(state.drafts[first.id]).toEqual([]);
    expect(state.drafts[second.id]).toEqual([second.ingredients[0]]);
    state = orderUpReducer(state, { type: 'select', wave: 0, customerId: second.id });
    state = fill(state, [second.ingredients[1]]);
    state = orderUpReducer(state, { type: 'serve', wave: 0, customerId: second.id });
    expect(state.phase).toEqual('between');
    expect(state.completed).toEqual(1);
  });

  it('supports undo and clear without judging an unfinished draft', () => {
    let state = begin();
    const customerId = state.selectedId;
    expect(orderUpReducer(state, { type: 'serve', wave: 0, customerId })).toEqual(state);
    state = fill(state, ['apple', 'pear']);
    expect(fill(state, ['mint'])).toEqual(state);
    state = orderUpReducer(state, { type: 'undo', wave: 0, customerId });
    expect(state.drafts[customerId]).toEqual(['apple']);
    state = orderUpReducer(state, { type: 'clear', wave: 0, customerId });
    expect(state.drafts[customerId]).toEqual([]);
    expect(state.attempted).toEqual(0);
  });

  it('prevents double serving and stale timer or next-wave actions', () => {
    const waves = [createOrderWave(0, () => 0.5), createOrderWave(1, () => 0.5)];
    let state = fill(begin(waves), waves[0].orders[0].ingredients);
    const action = { type: 'serve' as const, wave: 0, customerId: state.selectedId };
    state = orderUpReducer(state, action);
    expect(orderUpReducer(state, action)).toEqual(state);
    expect(state.score).toEqual(100);
    state = orderUpReducer(state, { type: 'next', wave: 0 });
    expect(state.waveIndex).toEqual(1);
    expect(orderUpReducer(state, { type: 'next', wave: 0 })).toEqual(state);
    expect(orderUpReducer(state, { type: 'tick', wave: 0, remaining: 0 })).toEqual(state);
    expect(state.phase).toEqual('watch');
  });

  it('finishes six waves with honest totals and resets streak on a skipped order', () => {
    const waves = Array.from({ length: ORDER_UP_WAVES }, (_, index) => createOrderWave(index, () => 0.5));
    let state = begin(waves);
    for (const wave of waves) {
      state = orderUpReducer(state, { type: 'hide', wave: wave.index });
      state = orderUpReducer(state, { type: 'acknowledge', wave: wave.index });
      for (const order of wave.orders) {
        state = orderUpReducer(state, { type: 'select', wave: wave.index, customerId: order.id });
        if (wave.index === 2) {
          state = orderUpReducer(state, { type: 'skip', wave: wave.index, customerId: order.id });
          expect(state.streak).toEqual(0);
        } else {
          state = fill(state, updatedIngredients(order, wave.update));
          state = orderUpReducer(state, { type: 'serve', wave: wave.index, customerId: order.id });
        }
      }
      state = orderUpReducer(state, { type: 'next', wave: wave.index });
    }
    expect(state.phase).toEqual('over');
    expect(state.attempted).toEqual(11);
    expect(state.completed).toEqual(9);
    expect(state.bestStreak).toEqual(7);
    expect(orderUpResult(state)).toEqual({
      score: 1110,
      stats: [
        { label: 'Orders completed', value: '9/11' },
        { label: 'Accuracy', value: '82%' },
        { label: 'Best service streak', value: '7' },
      ],
    });
    expect(orderUpReducer(state, { type: 'next', wave: 5 })).toEqual(state);
  });
});
