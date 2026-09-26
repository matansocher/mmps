import { DAYS, emptyProfile, INGREDIENTS, RECIPES } from './content';
import { advanceRun, applyCommand, cookingSeconds, createRun, recordResult, starsFor } from './engine';
import { parseProfile, runSchema } from './schema';
import type { Command, Run } from './types';

function command(run: Run, action: Command): Run {
  return applyCommand(run, action);
}
function opening(): Run {
  let run = advanceRun(createRun(1, 'career', 123, 'test-run'), 11);
  run = command(run, { type: 'seat' });
  run = advanceRun(run, 50);
  run = command(run, { type: 'table', id: 0 });
  return advanceRun(run, 15);
}
function prepareDish(run: Run): Run {
  const dish = run.orders[0].dishes[0];
  for (const ingredient of RECIPES[dish.recipeId].ingredients) {
    run = command(run, { type: 'prep', ingredient });
    run = advanceRun(run, 14);
    run = command(run, { type: 'add', dishId: dish.id, ingredient });
  }
  return run;
}

describe('Hell’s Kitchen simulation', () => {
  it('queues waiter work once and seats only waiting guests', () => {
    let run = advanceRun(createRun(1, 'career', 1, 'queue'), 11);
    run = command(command(run, { type: 'seat' }), { type: 'seat' });
    expect(run.waiterQueue).toHaveLength(1);
    run = advanceRun(run, 12);
    expect(run.waiting).toEqual(0);
    expect(run.tables[0].stage).toEqual('reading');
  });
  it('preserves identical results across frame grouping and does not mutate inputs', () => {
    const initial = opening();
    const before = structuredClone(initial);
    let individual = initial;
    for (let i = 0; i < 100; i++) individual = advanceRun(individual);
    expect(advanceRun(initial, 100)).toEqual(individual);
    expect(initial).toEqual(before);
  });
  it('pauses all clocks and continues cooking in an unseen room', () => {
    let run = prepareDish(opening());
    const paused = command(run, { type: 'pause' });
    expect(advanceRun(paused, 1000)).toEqual(paused);
    run = command(run, { type: 'view', view: 'dining' });
    const seconds = cookingSeconds(run.orders[0].dishes[0].recipeId, 1);
    run = advanceRun(run, seconds * 10);
    expect(run.orders[0].dishes[0].state).toEqual('ready');
    expect(run.orders[0].dishes[0].quality).toEqual(5);
  });
  it('burns unattended pans and permits a clean restart', () => {
    let run = prepareDish(opening());
    const dish = run.orders[0].dishes[0];
    run = advanceRun(run, cookingSeconds(dish.recipeId, 1) * 10 + 81);
    expect(run.orders[0].dishes[0].state).toEqual('burnt');
    expect(run.anger).toEqual(14);
    run = command(run, { type: 'discard', dishId: dish.id });
    expect(run.orders[0].dishes[0].state).toEqual('raw');
    expect(run.orders[0].dishes[0].loaded).toEqual([]);
  });
  it('rejects wrong ingredients without consuming a ready bowl', () => {
    let run = opening();
    const dish = run.orders[0].dishes[0];
    const wrong = INGREDIENTS.find((i) => !RECIPES[dish.recipeId].ingredients.includes(i))!;
    run = advanceRun(command(run, { type: 'prep', ingredient: wrong }), 14);
    run = command(run, { type: 'add', dishId: dish.id, ingredient: wrong });
    expect(run.bowls[wrong]).toEqual(true);
    expect(run.orders[0].dishes[0].loaded).toEqual([]);
  });
  it('round-trips an active simulation and rejects impossible save references', () => {
    const run = prepareDish(opening());
    expect(runSchema.parse(JSON.parse(JSON.stringify(run)))).toEqual(run);
    expect(runSchema.safeParse({ ...run, selectedOrder: 9999 }).success).toEqual(false);
    expect(parseProfile({ ...emptyProfile(), stars: { '99': 5 } })).toEqual(null);
    expect(parseProfile({ ...emptyProfile(), activeRun: { ...run, tick: Infinity } })).toEqual(null);
  });
  it('never changes terminal results and deduplicates repeated completion', () => {
    const run: Run = { ...createRun(1, 'career', 1, 'finished'), status: 'won', completed: 2, served: 2, qualityTotal: 10 };
    expect(advanceRun(run, 10)).toEqual(run);
    expect(starsFor(run)).toEqual(5);
    const once = recordResult(emptyProfile(), run);
    expect(recordResult(once, run)).toEqual(once);
    expect(once.unlockedDay).toEqual(2);
    expect(once.stars).toEqual({ '1': 5 });
  });
  it('has complete campaign content and valid recipe references', () => {
    expect(DAYS.map((d) => d.id)).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
    expect(RECIPES).toHaveLength(35);
    expect(DAYS.filter((d) => d.challenge).map((d) => d.id)).toEqual([8, 15, 22, 29]);
    expect(RECIPES.every((r) => r.ingredients.every((i) => INGREDIENTS.includes(i)))).toEqual(true);
  });
});

// A player policy executes real commands; it cannot edit state, skip timers or award results.
function playService(day: number, mode: Run['mode'] = 'career'): Run {
  let run = createRun(day, mode, 4711 + day, `complete-${mode}-${day}`);
  for (let tick = 0; tick < 16000 && run.status === 'running'; tick++) {
    if (run.waiting) run = applyCommand(run, { type: 'seat' });
    for (const table of run.tables) {
      if (table.stage === 'order' || table.stage === 'clear' || (table.stage === 'waiting' && run.orders.find((o) => o.tableId === table.id)?.dishes.every((d) => d.state === 'plated')))
        run = applyCommand(run, { type: 'table', id: table.id });
    }
    for (const order of run.orders) {
      for (const dish of order.dishes) {
        if (dish.state === 'ready') run = applyCommand(run, { type: 'plate', dishId: dish.id });
        if (dish.state === 'burnt') run = applyCommand(run, { type: 'discard', dishId: dish.id });
        if (dish.state === 'raw') {
          for (const ingredient of RECIPES[dish.recipeId].ingredients) {
            if (!dish.loaded.includes(ingredient)) {
              if (run.bowls[ingredient]) run = applyCommand(run, { type: 'add', dishId: dish.id, ingredient });
              else run = applyCommand(run, { type: 'prep', ingredient });
            }
          }
        }
      }
    }
    run = advanceRun(run);
  }
  return run;
}

describe('complete services', () => {
  test.each(DAYS.map((d) => d.id))('day %i can finish through real actions', (day) => {
    const run = playService(day);
    expect(run.status, `day ${day}, served=${run.served}, anger=${run.anger}, completed=${run.completed}`).toEqual('won');
    expect(starsFor(run)).toBeGreaterThan(0);
    const definition = DAYS[day - 1];
    expect(run.served).toEqual(definition.parties * (definition.challenge ? 1 : definition.courses));
    expect(runSchema.safeParse(run).success).toEqual(true);
  });
  it('arcade reaches its timed endpoint', () => {
    const run = playService(1, 'arcade');
    expect(run.status).toEqual('won');
    expect(run.tick).toEqual(2400);
    expect(run.served).toBeGreaterThan(0);
  });
});
