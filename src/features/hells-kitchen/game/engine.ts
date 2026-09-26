import { dayFor, INGREDIENTS, RECIPES } from './content';
import type { Command, Feedback, Ingredient, Order, Profile, Recipe, Run, Table, WaiterTask } from './types';

type Draft<T> = T extends readonly (infer U)[] ? Draft<U>[] : T extends object ? { -readonly [K in keyof T]: Draft<T[K]> } : T;
type State = Draft<Run>;
export const STEP_SECONDS = 0.1;
export const ARCADE_SECONDS = 240;
export const PREP_SECONDS = 0.9;
export const WAITER_SECONDS = 1.2;
export const STOVE_SLOTS = 3;
export const OVEN_SLOTS = 2;

function say(s: State, text: string, kind: Feedback['kind'] = 'info', cue: Feedback['cue'] = 'click'): void {
  s.feedback = { id: s.feedback.id + 1, text, kind, cue };
}

function random(s: State): number {
  let x = s.random | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  s.random = x >>> 0;
  return s.random / 4294967296;
}

export function createRun(day: number, mode: Run['mode'], seed: number, id: string, tutorial = false): Run {
  const def = dayFor(day);
  const challenge = def.challenge || mode === 'arcade';
  const s: State = {
    version: 1,
    id,
    day,
    mode,
    random: seed >>> 0 || 1,
    tick: 0,
    status: 'running',
    view: challenge ? 'blue' : 'dining',
    anger: 0,
    completed: 0,
    served: 0,
    qualityTotal: 0,
    arrivals: 0,
    waiting: 0,
    waitingPatience: def.patience,
    nextArrival: 1,
    tables: Array.from({ length: 5 }, (_, i) => ({ id: i, stage: 'empty', guests: 0, appearance: 1, patience: def.patience, elapsed: 0, course: 0 })),
    orders: [],
    selectedOrder: null,
    bowls: Object.fromEntries(INGREDIENTS.map((i) => [i, false])) as Record<Ingredient, boolean>,
    prepQueue: [],
    prepElapsed: 0,
    waiterQueue: [],
    waiterElapsed: 0,
    waiterTable: -1,
    nextId: 1,
    tutorial: tutorial && !challenge ? 0 : -1,
    feedback: { id: 1, kind: 'info', text: challenge ? 'The orders are coming. Keep your timing precise.' : 'Welcome to service. Greet your guests at reception.', cue: 'click' },
  };
  return s;
}

function queue(s: State, task: WaiterTask): void {
  if (s.waiterQueue.some((t) => t.target === task.target)) return;
  s.waiterQueue.push(task);
  say(s, `${task.action === 'seat' ? 'Greet guests' : task.action === 'order' ? 'Take order' : task.action === 'serve' ? 'Serve dishes' : 'Clear table'} queued.`);
}

export function menuFor(day: number, mode: Run['mode']): readonly Recipe[] {
  const max = mode === 'arcade' ? 35 : dayFor(day).recipeLimit;
  return RECIPES.slice(0, max).filter((r) => mode === 'arcade' || day >= 15 || !r.oven);
}

function orderFor(s: State, table: Draft<Table>): Draft<Order> {
  const def = dayFor(s.day);
  let choices = menuFor(s.day, s.mode);
  const dessert = table.course === def.courses - 1 && def.courses > 1;
  if (dessert) {
    const sweets = choices.filter((r) => r.ingredients.includes('fruit') || r.id === 3);
    if (sweets.length) choices = sweets;
  } else {
    choices = choices.filter((r) => !r.ingredients.includes('fruit'));
  }
  const order: Draft<Order> = {
    id: s.nextId++,
    tableId: table.id,
    kitchen: def.challenge && s.arrivals % 2 === 0 ? 'red' : 'blue',
    dishes: Array.from({ length: table.guests }, () => ({ id: s.nextId++, recipeId: choices[Math.floor(random(s) * choices.length)].id, loaded: [], state: 'raw', elapsed: 0, quality: 5 })),
  };
  s.orders.push(order);
  if (s.selectedOrder === null) s.selectedOrder = order.id;
  table.stage = 'waiting';
  table.elapsed = 0;
  table.patience = def.patience;
  return order;
}

function removeOrder(s: State, tableId: number): void {
  s.orders = s.orders.filter((o) => o.tableId !== tableId);
  if (!s.orders.some((o) => o.id === s.selectedOrder)) s.selectedOrder = s.orders[0]?.id ?? null;
}

function serve(s: State, table: Draft<Table>): void {
  const order = s.orders.find((o) => o.tableId === table.id);
  if (!order || order.dishes.some((d) => d.state !== 'plated')) return;
  const quality = Math.min(...order.dishes.map((d) => d.quality));
  s.served++;
  s.qualityTotal += quality;
  s.anger = Math.max(0, s.anger - quality * 3);
  table.stage = 'eating';
  table.elapsed = 0;
  removeOrder(s, table.id);
  say(
    s,
    quality >= 4 ? 'Beautifully done. That is the standard!' : quality >= 2 ? 'Good. Now keep the quality up.' : 'That plate waited too long. Watch your timing.',
    quality >= 3 ? 'good' : 'warning',
    'serve',
  );
  if (dayFor(s.day).challenge || s.mode === 'arcade') {
    table.stage = 'empty';
    table.guests = 0;
    s.completed++;
  }
}

function completeTask(s: State, task: WaiterTask): void {
  const table = s.tables[task.target];
  if (!table) return;
  const def = dayFor(s.day);
  s.waiterTable = task.target;
  if (task.action === 'seat' && table.stage === 'empty' && s.waiting > 0) {
    s.waiting--;
    s.waitingPatience = def.patience;
    table.stage = 'reading';
    table.guests = def.groupSize;
    table.appearance = 1 + Math.floor(random(s) * 3);
    table.elapsed = 0;
    table.course = 0;
    table.patience = def.patience;
    if (s.tutorial === 0) s.tutorial = 1;
    say(s, 'Guests are seated. Let them choose, then take their order.');
  } else if (task.action === 'order' && table.stage === 'order') {
    orderFor(s, table);
    if (s.tutorial === 1) s.tutorial = 2;
    say(s, `Table ${table.id + 1} ordered. Into the kitchen!`);
  } else if (task.action === 'serve') {
    serve(s, table);
    if (s.tutorial === 5) s.tutorial = -1;
  } else if (task.action === 'clear' && table.stage === 'clear') {
    table.course++;
    table.elapsed = 0;
    if (table.course >= def.courses) {
      table.stage = 'empty';
      table.guests = 0;
      s.completed++;
      say(s, 'Table cleared. Ready for the next guests.', 'good');
    } else {
      table.stage = 'reading';
      table.patience = def.patience;
      say(s, 'The next course is coming. Keep your station ready.');
    }
  }
}

export function applyCommand(run: Run, command: Command): Run {
  if (command.type === 'pause') return run.status === 'running' ? { ...run, status: 'paused' } : run;
  if (command.type === 'resume') return run.status === 'paused' ? { ...run, status: 'running' } : run;
  if (run.status !== 'running') return run;
  const s = structuredClone(run) as State;
  const def = dayFor(s.day);
  if (command.type === 'view') {
    if (command.view === 'red' && !def.challenge) return run;
    s.view = command.view;
    if (s.view !== 'dining') s.selectedOrder = s.orders.find((o) => o.kitchen === s.view)?.id ?? null;
  } else if (command.type === 'select') {
    const order = s.orders.find((o) => o.id === command.id);
    if (order) {
      s.selectedOrder = order.id;
      s.view = order.kitchen;
    }
  } else if (command.type === 'prep') {
    if (!INGREDIENTS.includes(command.ingredient) || s.bowls[command.ingredient] || s.prepQueue.includes(command.ingredient)) return run;
    s.prepQueue.push(command.ingredient);
    say(s, 'Preparation queued. You can prepare several ingredients ahead.');
  } else if (command.type === 'seat') {
    const reserved = s.waiterQueue.filter((t) => t.action === 'seat');
    const table = s.tables.slice(0, def.tables).find((t) => t.stage === 'empty' && !reserved.some((r) => r.target === t.id));
    if (!table || s.waiting <= reserved.length) {
      say(s, s.waiting ? 'Clear a table before seating more guests.' : 'No guests at reception yet.');
      return s;
    }
    queue(s, { target: table.id, action: 'seat' });
  } else if (command.type === 'table') {
    const table = s.tables[command.id];
    if (!table) return run;
    if (table.stage === 'order') queue(s, { target: table.id, action: 'order' });
    else if (table.stage === 'clear') queue(s, { target: table.id, action: 'clear' });
    else if (table.stage === 'waiting') {
      const order = s.orders.find((o) => o.tableId === table.id);
      if (order?.dishes.every((d) => d.state === 'plated')) queue(s, { target: table.id, action: 'serve' });
      else if (order) {
        s.selectedOrder = order.id;
        s.view = order.kitchen;
      }
    }
  } else if (command.type === 'tutorial-skip') s.tutorial = -1;
  else if (command.type === 'tutorial-next') s.tutorial = s.tutorial >= 5 ? -1 : s.tutorial + 1;
  else if ('dishId' in command) {
    const order = s.orders.find((o) => o.dishes.some((d) => d.id === command.dishId));
    const dish = order?.dishes.find((d) => d.id === command.dishId);
    if (!dish || !order) return run;
    if (command.type === 'add') {
      const recipe = RECIPES[dish.recipeId];
      if (dish.state !== 'raw' || !s.bowls[command.ingredient] || !recipe.ingredients.includes(command.ingredient) || dish.loaded.includes(command.ingredient)) {
        say(s, 'That ingredient is not ready or does not belong in this pan.', 'warning');
        return s;
      }
      const occupied = s.orders
        .filter((o) => o.kitchen === order.kitchen)
        .flatMap((o) => o.dishes)
        .filter((d) => ['cooking', 'ready', 'burnt'].includes(d.state) && RECIPES[d.recipeId].oven === recipe.oven).length;
      if (dish.loaded.length === recipe.ingredients.length - 1 && occupied >= (recipe.oven ? OVEN_SLOTS : STOVE_SLOTS)) {
        say(s, recipe.oven ? 'The oven is full. Plate or clear an oven dish first.' : 'All burners are occupied. Plate a ready dish first.', 'warning');
        return s;
      }
      s.bowls[command.ingredient] = false;
      dish.loaded.push(command.ingredient);
      if (s.tutorial === 2) s.tutorial = 3;
      if (dish.loaded.length === recipe.ingredients.length) {
        dish.state = 'cooking';
        dish.elapsed = 0;
        say(s, 'Cooking. Watch the timer and prepare the next dish.');
        if (s.tutorial === 3) s.tutorial = 4;
      }
    } else if (command.type === 'plate' && dish.state === 'ready') {
      dish.state = 'plated';
      dish.elapsed = 0;
      say(s, order.dishes.every((d) => d.state === 'plated') ? 'Order complete. Serve it while it is hot!' : 'On the pass. Finish the rest of this order.', 'good', 'ready');
      if (s.tutorial === 4) s.tutorial = 5;
      if ((def.challenge || s.mode === 'arcade') && order.dishes.every((d) => d.state === 'plated')) serve(s, s.tables[order.tableId]);
    } else if (command.type === 'discard' && dish.state === 'burnt') {
      dish.state = 'raw';
      dish.loaded = [];
      dish.elapsed = 0;
      dish.quality = 5;
      say(s, 'Fresh pan. Start this dish again.');
    }
  }
  return s;
}

export function cookingSeconds(recipeId: number, day: number): number {
  const recipe = RECIPES[recipeId];
  return recipe.oven && day >= 24 ? 12 : recipe.seconds;
}

function step(s: State): void {
  const dt = STEP_SECONDS;
  const def = dayFor(s.day);
  const auto = def.challenge || s.mode === 'arcade';
  s.tick++;
  const seconds = s.tick * dt;
  if (seconds >= s.nextArrival && (s.mode === 'arcade' || s.arrivals < def.parties)) {
    const empty = s.tables.slice(0, def.tables).find((t) => t.stage === 'empty');
    if (auto && !empty) s.nextArrival = seconds + 2;
    else {
      s.arrivals++;
      s.nextArrival = seconds + (s.mode === 'arcade' ? Math.max(14, 32 - seconds / 25) : def.arrivalEvery);
      if (auto && empty) {
        empty.guests = s.mode === 'arcade' ? Math.min(3, 1 + Math.floor(seconds / 80)) : def.groupSize;
        empty.course = 0;
        orderFor(s, empty);
        say(s, `New ${s.orders.at(-1)?.kitchen} kitchen order.`, 'info', 'arrival');
      } else {
        s.waiting++;
        say(s, 'Guests have arrived. Greet them at reception.', 'info', 'arrival');
      }
    }
  }
  if (s.waiting > 0) {
    s.waitingPatience -= dt;
    if (s.waitingPatience <= 0) {
      s.waiting--;
      s.completed++;
      s.waitingPatience = def.patience;
      s.anger += 24;
      say(s, 'Guests left without being seated. Watch the dining room!', 'bad', 'burn');
    }
  }
  if (s.prepQueue.length) {
    s.prepElapsed += dt;
    if (s.prepElapsed + 1e-8 >= PREP_SECONDS) {
      s.bowls[s.prepQueue.shift()!] = true;
      s.prepElapsed = 0;
    }
  }
  if (s.waiterQueue.length) {
    s.waiterElapsed += dt;
    if (s.waiterElapsed + 1e-8 >= WAITER_SECONDS) {
      completeTask(s, s.waiterQueue.shift()!);
      s.waiterElapsed = 0;
    }
  }
  for (const table of s.tables) {
    if (table.stage === 'empty') continue;
    table.elapsed += dt;
    if (table.stage === 'reading' && table.elapsed >= 3) {
      table.stage = 'order';
      table.elapsed = 0;
    }
    if (table.stage === 'eating' && table.elapsed >= 6) {
      table.stage = 'clear';
      table.elapsed = 0;
    }
    if (['order', 'waiting', 'clear'].includes(table.stage)) {
      table.patience -= dt;
      if (table.patience <= 0) {
        table.stage = 'empty';
        table.guests = 0;
        s.completed++;
        s.anger += 26;
        removeOrder(s, table.id);
        s.waiterQueue = s.waiterQueue.filter((t) => t.target !== table.id);
        say(s, 'That table walked out. Get the next order right!', 'bad', 'burn');
      }
    }
  }
  for (const order of s.orders) {
    for (const dish of order.dishes) {
      if (dish.state === 'raw' || dish.state === 'burnt') continue;
      dish.elapsed += dt;
      if (dish.state === 'cooking' && dish.elapsed + 1e-8 >= cookingSeconds(dish.recipeId, s.day)) {
        dish.state = 'ready';
        dish.elapsed = 0;
        say(s, `${RECIPES[dish.recipeId].name} is ready. Take it off the heat!`, 'info', 'ready');
      } else if (dish.state === 'ready') {
        dish.quality = Math.max(0, 5 - Math.max(0, dish.elapsed - 1) * 0.65);
        if (dish.elapsed >= 8) {
          dish.state = 'burnt';
          dish.quality = 0;
          s.anger += 14;
          say(s, 'It is burnt! Clear the pan and start again.', 'bad', 'burn');
        }
      } else if (dish.state === 'plated' && dish.elapsed > 3) dish.quality = Math.max(0.5, dish.quality - dt * 0.065);
    }
  }
  s.anger = Math.min(100, s.anger);
  if (s.anger >= 100) {
    s.status = 'lost';
    say(s, 'Enough! This kitchen is closed. Come back focused.', 'bad', 'failure');
  } else if ((s.mode === 'career' && s.completed >= def.parties && !s.orders.length && !s.waiting) || (s.mode === 'arcade' && seconds >= ARCADE_SECONDS)) {
    s.status = s.served > 0 && starsFor(s) > 0 ? 'won' : 'lost';
    say(
      s,
      s.status === 'won' ? 'Service complete. Let’s see how you did.' : 'No successful dishes. We need to try that again.',
      s.status === 'won' ? 'good' : 'bad',
      s.status === 'won' ? 'success' : 'failure',
    );
  }
}

export function advanceRun(run: Run, ticks = 1): Run {
  if (!Number.isInteger(ticks) || ticks < 0 || ticks > 36000) throw new Error('Invalid tick count');
  if (run.status !== 'running' || ticks === 0) return run;
  const s = structuredClone(run) as State;
  for (let i = 0; i < ticks && s.status === 'running'; i++) step(s);
  return s;
}

export function starsFor(run: Run): number {
  if (!run.served) return 0;
  const def = dayFor(run.day);
  const expected = run.mode === 'arcade' ? Math.max(1, run.completed) : def.parties * (def.challenge ? 1 : def.courses);
  const coverage = Math.min(1, run.served / expected);
  return Math.max(0, Math.min(5, Math.round((run.qualityTotal / run.served) * coverage - run.anger / 65)));
}

export function recordResult(profile: Profile, run: Run): Profile {
  if (run.status !== 'won' && run.status !== 'lost') return { ...profile, activeRun: run };
  if (profile.completedRunIds.includes(run.id)) return { ...profile, activeRun: null };
  const stars = { ...profile.stars };
  if (run.mode === 'career' && run.status === 'won') stars[String(run.day)] = Math.max(stars[String(run.day)] ?? 0, starsFor(run));
  return {
    ...profile,
    stars,
    activeRun: null,
    tutorialDone: profile.tutorialDone || run.day === 1,
    unlockedDay: run.mode === 'career' && run.status === 'won' ? Math.max(profile.unlockedDay, Math.min(36, run.day + 1)) : profile.unlockedDay,
    arcadeBest: run.mode === 'arcade' ? Math.max(profile.arcadeBest, run.served) : profile.arcadeBest,
    completedRunIds: [...profile.completedRunIds.slice(-99), run.id],
  };
}
