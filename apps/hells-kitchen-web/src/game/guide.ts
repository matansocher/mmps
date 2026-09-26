import { dayFor, INGREDIENT_LABELS, INGREDIENTS, RECIPES } from '../../../../src/features/hells-kitchen/game/content';
import { cookingSeconds, OVEN_SLOTS, STOVE_SLOTS } from '../../../../src/features/hells-kitchen/game/engine';
import type { Dish, Ingredient, Order, Run } from '../../../../src/features/hells-kitchen/game/types';
import { bowlRect, GREET_RECT, MAX_TICKETS, NAV_RECTS, panRect, type Rect, tableRect, ticketRect } from './layout';

export type Guide = { readonly title: string; readonly text: string; readonly target: Rect | null };

const label = (ingredient: Ingredient) => INGREDIENT_LABELS[ingredient];
const bowl = (ingredient: Ingredient) => bowlRect(INGREDIENTS.indexOf(ingredient));
const unplated = (order: Order) => order.dishes.some((d) => d.state !== 'plated');
const urgent = (dish: Dish) => dish.state === 'ready' || dish.state === 'burnt';
const missing = (dish: Dish) => RECIPES[dish.recipeId].ingredients.filter((i) => !dish.loaded.includes(i));

export function ticketsFor(run: Run, kitchen: 'blue' | 'red'): readonly Order[] {
  return run.orders.filter((o) => o.kitchen === kitchen).slice(0, MAX_TICKETS);
}

// How many raw dishes in a kitchen still need each ingredient.
export function neededIngredients(run: Run, kitchen: 'blue' | 'red'): Record<Ingredient, number> {
  const counts = Object.fromEntries(INGREDIENTS.map((i) => [i, 0])) as Record<Ingredient, number>;
  for (const order of ticketsFor(run, kitchen)) for (const dish of order.dishes) if (dish.state === 'raw') for (const i of missing(dish)) counts[i]++;
  return counts;
}

export function stationFull(run: Run, kitchen: 'blue' | 'red', oven: boolean): boolean {
  const occupied = run.orders
    .filter((o) => o.kitchen === kitchen)
    .flatMap((o) => o.dishes)
    .filter((d) => ['cooking', 'ready', 'burnt'].includes(d.state) && RECIPES[d.recipeId].oven === oven).length;
  return occupied >= (oven ? OVEN_SLOTS : STOVE_SLOTS);
}

function blocked(run: Run, order: Order, dish: Dish, ingredient: Ingredient): boolean {
  return missing(dish).length === 1 && missing(dish)[0] === ingredient && stationFull(run, order.kitchen, RECIPES[dish.recipeId].oven);
}

function diningTasks(run: Run): boolean {
  const def = dayFor(run.day);
  const queued = (id: number) => run.waiterQueue.some((t) => t.target === id);
  return (
    run.waiting > 0 ||
    run.tables.slice(0, def.tables).some((t) => !queued(t.id) && (t.stage === 'order' || t.stage === 'clear' || (t.stage === 'waiting' && run.orders.some((o) => o.tableId === t.id && !unplated(o)))))
  );
}

function dining(run: Run): Guide {
  const def = dayFor(run.day);
  const queued = (id: number) => run.waiterQueue.some((t) => t.target === id);
  const burning = run.orders.find((o) => o.dishes.some(urgent));
  if (burning) return { title: 'A dish is ready!', text: `Hurry to the ${burning.kitchen} kitchen and take it off the heat before it burns.`, target: NAV_RECTS[burning.kitchen] };
  const tables = run.tables.slice(0, def.tables).filter((t) => !queued(t.id));
  const serve = tables.find((t) => t.stage === 'waiting' && run.orders.some((o) => o.tableId === t.id && !unplated(o)));
  if (serve) return { title: `Serve table ${serve.id + 1}`, text: 'Every plate is on the pass. Click the table so the waiter serves the whole order together.', target: tableRect(serve.id) };
  const order = tables.find((t) => t.stage === 'order');
  if (order) return { title: `Take table ${order.id + 1}’s order`, text: 'The guests are ready to order. Click their table to send the waiter.', target: tableRect(order.id) };
  const clear = tables.find((t) => t.stage === 'clear');
  if (clear) return { title: `Clear table ${clear.id + 1}`, text: 'The guests have finished. Click the table to clear it for the next course or guests.', target: tableRect(clear.id) };
  const reserved = run.waiterQueue.filter((t) => t.action === 'seat').length;
  const free = run.tables.slice(0, def.tables).some((t) => t.stage === 'empty' && !queued(t.id));
  if (run.waiting > reserved && free) return { title: 'Greet your guests', text: 'Guests are waiting at reception. Click GREET GUESTS to seat them before they leave.', target: GREET_RECT };
  const cooking = run.orders.find(unplated);
  if (cooking) return { title: `Cook table ${cooking.tableId + 1}’s order`, text: `The ticket is waiting in the ${cooking.kitchen} kitchen. Go and cook it.`, target: NAV_RECTS[cooking.kitchen] };
  if (run.waiterQueue.length) return { title: 'The waiter is on it', text: 'Your waiter works through the jobs you queued, one at a time.', target: null };
  if (run.tables.slice(0, def.tables).some((t) => t.stage === 'reading'))
    return { title: 'Guests are choosing', text: 'Give them a moment. A blue ! appears when a table is ready to order.', target: null };
  return { title: 'Waiting for guests', text: 'New guests arrive at the reception desk on the right. You can prep ingredients in the kitchen meanwhile.', target: null };
}

function kitchen(run: Run, selected: Ingredient | null): Guide {
  const view = run.view as 'blue' | 'red';
  const def = dayFor(run.day);
  const auto = def.challenge || run.mode === 'arcade';
  const tickets = ticketsFor(run, view);
  const serving = (o: Order) => run.waiterQueue.some((t) => t.action === 'serve' && t.target === o.tableId);
  const picked = tickets.find((o) => o.id === run.selectedOrder);
  const order = picked && !unplated(picked) && serving(picked) ? undefined : picked;
  const hurry = order?.dishes.findIndex(urgent) ?? -1;
  if (order && hurry >= 0) {
    const dish = order.dishes[hurry];
    return dish.state === 'burnt'
      ? { title: 'It’s burnt!', text: `Click the ${RECIPES[dish.recipeId].name} pan to throw it away, then cook it again.`, target: panRect(hurry) }
      : { title: 'Take it off the heat!', text: `The ${RECIPES[dish.recipeId].name} is ready. Click the pan now to plate it — every second costs stars.`, target: panRect(hurry) };
  }
  const elsewhere = tickets.findIndex((o) => o.dishes.some(urgent));
  if (elsewhere >= 0) return { title: 'Another dish is ready!', text: `Table ${tickets[elsewhere].tableId + 1} has a dish ready. Click its ticket to get to it.`, target: ticketRect(elsewhere) };
  const other = view === 'blue' ? 'red' : 'blue';
  if (def.challenge && run.orders.some((o) => o.kitchen === other && o.dishes.some(urgent)))
    return { title: `The ${other} kitchen needs you!`, text: `A dish is ready in the ${other} kitchen. Switch over before it burns.`, target: NAV_RECTS[other] };
  if (!auto && order && !unplated(order))
    return { title: `Serve table ${order.tableId + 1}`, text: 'The whole order is on the pass. Go to the dining room and click the table to serve it.', target: NAV_RECTS.dining };
  if (!order) {
    const next = tickets.findIndex(unplated);
    if (next >= 0) return { title: 'Pick an order', text: 'Click an order ticket along the top to see its recipes.', target: ticketRect(next) };
    if (auto) return { title: 'Orders are coming', text: 'Tickets arrive on their own today. Click ingredient bowls to prep them ahead.', target: null };
    if (!auto && diningTasks(run)) return { title: 'Go to the dining room', text: 'There is nothing to cook yet. Your guests need attention.', target: NAV_RECTS.dining };
    return { title: 'No orders yet', text: 'Take an order in the dining room first. Tip: you can prep ingredients ahead by clicking the bowls.', target: null };
  }
  const raw = order.dishes
    .map((dish, index) => ({ dish, index, recipe: RECIPES[dish.recipeId] }))
    .filter(({ dish }) => dish.state === 'raw')
    .sort((a, b) => cookingSeconds(b.dish.recipeId, run.day) - cookingSeconds(a.dish.recipeId, run.day));
  if (selected) {
    const into = raw.find(({ dish }) => missing(dish).includes(selected) && !blocked(run, order, dish, selected));
    if (into) return { title: `Add the ${label(selected)}`, text: `Click the glowing ${into.recipe.name} pan to drop the ${label(selected)} in.`, target: panRect(into.index) };
    return { title: `${label(selected)} isn’t needed here`, text: `No free pan on this ticket takes ${label(selected)}. Click the bowl again to put it down.`, target: bowl(selected) };
  }
  for (const { dish, recipe } of raw) {
    const ingredient = missing(dish).find((i) => run.bowls[i] && !blocked(run, order, dish, i));
    if (ingredient) return { title: `Pick up the ${label(ingredient)}`, text: `Click the ${label(ingredient)} bowl, then click the ${recipe.name} pan.`, target: bowl(ingredient) };
  }
  for (const { dish, recipe } of raw) {
    const ingredient = missing(dish).find((i) => !run.bowls[i] && !run.prepQueue.includes(i));
    if (ingredient) return { title: `Prep the ${label(ingredient)}`, text: `The ${recipe.name} needs ${label(ingredient)}. Click its bowl to prepare a portion.`, target: bowl(ingredient) };
  }
  if (run.prepQueue.length) return { title: `Prepping ${label(run.prepQueue[0])}…`, text: 'Hold on — it is being chopped. Queued bowls are prepared in the order you clicked them.', target: null };
  if (raw.length) return { title: 'The station is full', text: 'Every burner is busy. Plate a finished dish to free one up.', target: null };
  const nextTicket = tickets.findIndex((o) => o.id !== order.id && o.dishes.some((d) => d.state === 'raw'));
  if (nextTicket >= 0) return { title: 'Start the next order', text: `While this cooks, open table ${tickets[nextTicket].tableId + 1}’s ticket and get it going.`, target: ticketRect(nextTicket) };
  if (def.challenge && run.orders.some((o) => o.kitchen === other && o.dishes.some((d) => d.state === 'raw')))
    return { title: `Check the ${other} kitchen`, text: `While this cooks, start the orders waiting in the ${other} kitchen.`, target: NAV_RECTS[other] };
  if (!auto && diningTasks(run))
    return { title: 'Check the dining room', text: 'Everything is cooking. Use the time to look after your guests — but come back before the timer ends.', target: NAV_RECTS.dining };
  const cooking = order.dishes
    .map((dish, index) => ({ dish, index }))
    .filter(({ dish }) => dish.state === 'cooking')
    .sort((a, b) => cookingSeconds(a.dish.recipeId, run.day) - a.dish.elapsed - (cookingSeconds(b.dish.recipeId, run.day) - b.dish.elapsed))[0];
  if (cooking) return { title: 'Watch the timer', text: 'Be ready to click the pan the moment it says READY.', target: panRect(cooking.index) };
  return { title: 'Nice work', text: 'This order is done. Keep an eye on the other tickets.', target: null };
}

export function nextStep(run: Run, selected: Ingredient | null): Guide {
  return run.view === 'dining' ? dining(run) : kitchen(run, selected);
}
