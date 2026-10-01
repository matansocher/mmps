import { dayFor, INGREDIENT_LABELS, RECIPES } from '../../../../src/features/hells-kitchen/game/content';
import { cookingSeconds, OVEN_SLOTS, STOVE_SLOTS } from '../../../../src/features/hells-kitchen/game/engine';
import type { Dish, Ingredient, Order, Run } from '../../../../src/features/hells-kitchen/game/types';
import { type Cookware, cookwareFor } from './art';
import { bowlRect, MAX_TICKETS, pantryFor, passRect, pileRect, potRect, RECEPTION_RECT, type Rect, SWITCH_RECTS, tableRect, ticketRect, timerRect } from './layout';

export type Guide = { readonly title: string; readonly text: string; readonly target: Rect | null };

const COOKWARE_NAMES: Record<Cookware, string> = { pot: 'pot', pan: 'frying pan', roaster: 'roasting dish' };
export const cookwareName = (dish: Dish): string => COOKWARE_NAMES[cookwareFor(RECIPES[dish.recipeId])];
const label = (ingredient: Ingredient) => INGREDIENT_LABELS[ingredient].toLowerCase();
const unplated = (order: Order) => order.dishes.some((d) => d.state !== 'plated');
const urgent = (dish: Dish) => dish.state === 'ready' || dish.state === 'burnt';
const missing = (dish: Dish) => RECIPES[dish.recipeId].ingredients.filter((i) => !dish.loaded.includes(i));
const remaining = (run: Run, dish: Dish) => cookingSeconds(dish.recipeId, run.day) - dish.elapsed;

export function ticketsFor(run: Run, kitchen: 'blue' | 'red'): readonly Order[] {
  return run.orders.filter((o) => o.kitchen === kitchen).slice(0, MAX_TICKETS);
}

// Fully plated orders waiting on the dining room pass for the waiter.
export function passOrders(run: Run): readonly Order[] {
  return run.orders.filter((o) => !unplated(o) && !run.waiterQueue.some((t) => t.action === 'serve' && t.target === o.tableId)).slice(0, 4);
}

// How many raw dishes in a kitchen still need each ingredient.
export function neededIngredients(run: Run, kitchen: 'blue' | 'red'): Record<Ingredient, number> {
  const counts = Object.fromEntries(Object.keys(INGREDIENT_LABELS).map((i) => [i, 0])) as Record<Ingredient, number>;
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

function counter(run: Run, ingredient: Ingredient, pile = false): Rect {
  const pantry = pantryFor(run);
  const index = Math.max(0, pantry.indexOf(ingredient));
  return pile ? pileRect(index, pantry.length) : bowlRect(index, pantry.length);
}

export function diningTasks(run: Run): boolean {
  const def = dayFor(run.day);
  const queued = (id: number) => run.waiterQueue.some((t) => t.target === id);
  return run.waiting > 0 || passOrders(run).length > 0 || run.tables.slice(0, def.tables).some((t) => !queued(t.id) && (t.stage === 'order' || t.stage === 'clear'));
}

function dining(run: Run): Guide {
  const def = dayFor(run.day);
  const queued = (id: number) => run.waiterQueue.some((t) => t.target === id);
  if (run.orders.some((o) => o.dishes.some(urgent))) return { title: 'A dish is ready!', text: 'Select the Switch Rooms button and get it off the heat before it burns.', target: SWITCH_RECTS.dining };
  const platters = passOrders(run);
  if (platters.length)
    return {
      title: `Serve table ${platters[0].tableId + 1}`,
      text: `The meal is ready. Select the platter on the meal counter to deliver it to table ${platters[0].tableId + 1}.`,
      target: passRect(0),
    };
  const tables = run.tables.slice(0, def.tables).filter((t) => !queued(t.id));
  const order = tables.find((t) => t.stage === 'order');
  if (order)
    return { title: `Table ${order.id + 1} is ready`, text: 'When the blue light glows, the customers are ready to order. Select their table to take the order.', target: tableRect(order.id) };
  const clear = tables.find((t) => t.stage === 'clear');
  if (clear) return { title: `Clear table ${clear.id + 1}`, text: 'Once the customers have finished eating, select their table to clear the dishes.', target: tableRect(clear.id) };
  const reserved = run.waiterQueue.filter((t) => t.action === 'seat').length;
  const free = run.tables.slice(0, def.tables).some((t) => t.stage === 'empty' && !queued(t.id));
  if (run.waiting > reserved && free) return { title: 'Customers are waiting', text: 'Select the customers at the reception desk to seat them before they lose patience.', target: RECEPTION_RECT };
  if (run.orders.some(unplated)) return { title: 'Fill the order', text: 'Select the Switch Rooms button to enter the kitchen and fill their order.', target: SWITCH_RECTS.dining };
  if (run.waiterQueue.length) return { title: 'The waiter is on it', text: 'Your waiter handles the jobs you give him one at a time.', target: null };
  if (run.tables.slice(0, def.tables).some((t) => t.stage === 'reading'))
    return { title: 'Customers are choosing', text: 'Give them a moment. The blue light glows when a table needs you.', target: null };
  return { title: 'Waiting for customers', text: 'New customers arrive at the reception desk. You can prep ingredients in the kitchen meanwhile.', target: null };
}

function kitchen(run: Run, selected: Ingredient | null): Guide {
  const view = run.view as 'blue' | 'red';
  const def = dayFor(run.day);
  const auto = def.challenge || run.mode === 'arcade';
  const tickets = ticketsFor(run, view);
  const other = view === 'blue' ? 'red' : 'blue';
  const serving = (o: Order) => run.waiterQueue.some((t) => t.action === 'serve' && t.target === o.tableId);
  const picked = tickets.find((o) => o.id === run.selectedOrder);
  const order = picked && !unplated(picked) && serving(picked) ? undefined : picked;
  const hurry = order?.dishes.findIndex(urgent) ?? -1;
  if (order && hurry >= 0) {
    const dish = order.dishes[hurry];
    return dish.state === 'burnt'
      ? { title: 'It’s burnt!', text: `Drag the ${cookwareName(dish)} to the trash, then cook the ${RECIPES[dish.recipeId].name} again.`, target: potRect(hurry) }
      : { title: 'Take it off the heat!', text: `The timer reached 00. Drag the ${cookwareName(dish)} to its plate to minimize overcooking.`, target: potRect(hurry) };
  }
  const elsewhere = tickets.findIndex((o) => o.dishes.some(urgent));
  if (elsewhere >= 0) return { title: 'Another dish is ready!', text: `Table ${tickets[elsewhere].tableId + 1} has a dish ready. Select its ticket.`, target: ticketRect(elsewhere) };
  if (def.challenge && run.orders.some((o) => o.kitchen === other && o.dishes.some(urgent)))
    return { title: `The ${other} kitchen needs you!`, text: `A dish is ready in the ${other} kitchen. Switch kitchens before it burns.`, target: SWITCH_RECTS.kitchen };
  if (!auto && order && !unplated(order)) return { title: 'The order is plated', text: 'Select the Switch Rooms button to follow the meals to the dining room.', target: SWITCH_RECTS.kitchen };
  if (!order) {
    const next = tickets.findIndex(unplated);
    if (next >= 0) return { title: 'Pick an order', text: 'Select an order ticket at the top to bring its recipes to the stove.', target: ticketRect(next) };
    if (auto) return { title: 'Orders are coming', text: 'Tickets arrive on their own today. Select raw food on the counter to prep it ahead.', target: null };
    if (diningTasks(run)) return { title: 'Your customers need you', text: 'There is nothing to cook yet. Select the Switch Rooms button to go to the dining room.', target: SWITCH_RECTS.kitchen };
    return { title: 'No orders yet', text: 'Take an order in the dining room first. You can prep ingredients ahead by selecting the raw food.', target: null };
  }
  const raw = order.dishes
    .map((dish, index) => ({ dish, index }))
    .filter(({ dish }) => dish.state === 'raw')
    .sort((a, b) => cookingSeconds(b.dish.recipeId, run.day) - cookingSeconds(a.dish.recipeId, run.day));
  const cooking = order.dishes.map((dish, index) => ({ dish, index })).filter(({ dish }) => dish.state === 'cooking');
  const slowest = cooking.sort((a, b) => remaining(run, b.dish) - remaining(run, a.dish))[0];
  // The original's core rule: start each dish so the whole order finishes at the same time.
  const early = (dish: Dish, ingredient: Ingredient) =>
    Boolean(slowest && missing(dish).length === 1 && missing(dish)[0] === ingredient && remaining(run, slowest.dish) - cookingSeconds(dish.recipeId, run.day) > 0.6);
  if (selected) {
    const into = raw.find(({ dish }) => missing(dish).includes(selected) && !blocked(run, order, dish, selected));
    if (into && early(into.dish, selected))
      return {
        title: 'Wait for the timers to match',
        text: `Drop the ${label(selected)} in the ${cookwareName(into.dish)} when the ${cookwareName(slowest!.dish)} timer reaches ${String(cookingSeconds(into.dish.recipeId, run.day)).padStart(2, '0')}.`,
        target: timerRect(slowest!.index),
      };
    if (into) return { title: `Add the ${label(selected)}`, text: `Drop the ${label(selected)} into the glowing ${cookwareName(into.dish)}.`, target: potRect(into.index) };
    return { title: `No ${label(selected)} needed`, text: `Nothing on this ticket needs ${label(selected)}. Select the bowl again to put it down.`, target: counter(run, selected) };
  }
  for (const { dish } of raw) {
    const ingredient = missing(dish).find((i) => run.bowls[i] && !blocked(run, order, dish, i));
    if (!ingredient) continue;
    if (early(dish, ingredient))
      return {
        title: 'Wait for the timers to match',
        text: `We want both recipes to finish together. Add the ${label(ingredient)} when the ${cookwareName(slowest!.dish)} timer reaches ${String(cookingSeconds(dish.recipeId, run.day)).padStart(2, '0')}.`,
        target: timerRect(slowest!.index),
      };
    return { title: `Add the ${label(ingredient)}`, text: `Drag the ${label(ingredient)} bowl into the ${cookwareName(dish)}.`, target: counter(run, ingredient) };
  }
  for (const { dish } of raw) {
    const ingredient = missing(dish).find((i) => !run.bowls[i] && !run.prepQueue.includes(i));
    if (!ingredient) continue;
    return run.prepQueue.length
      ? { title: 'Queue the next ingredient', text: `You can queue the ${label(ingredient)} to be prepared next by selecting them immediately.`, target: counter(run, ingredient, true) }
      : { title: `Prep the ${label(ingredient)}`, text: `Select the raw ${label(ingredient)} to start preparing them.`, target: counter(run, ingredient, true) };
  }
  if (run.prepQueue.length) return { title: 'Preparing…', text: 'The ingredients are being prepared in the order you selected them.', target: null };
  if (raw.length) return { title: 'The stove is full', text: 'Every burner is busy. Plate a finished dish to free one up.', target: null };
  const nextTicket = tickets.findIndex((o) => o.id !== order.id && o.dishes.some((d) => d.state === 'raw'));
  if (nextTicket >= 0) return { title: 'Start the next order', text: `While this cooks, select table ${tickets[nextTicket].tableId + 1}’s ticket and get it going.`, target: ticketRect(nextTicket) };
  if (def.challenge && run.orders.some((o) => o.kitchen === other && o.dishes.some((d) => d.state === 'raw')))
    return { title: `Check the ${other} kitchen`, text: `While this cooks, start the orders waiting in the ${other} kitchen.`, target: SWITCH_RECTS.kitchen };
  if (!auto && diningTasks(run))
    return { title: 'Check the dining room', text: 'Everything is cooking. Look after your customers, but come back before the timers reach 00.', target: SWITCH_RECTS.kitchen };
  if (slowest) return { title: 'Watch the timers', text: `As soon as the timer reaches 00, drag the ${cookwareName(slowest.dish)} to the plate.`, target: timerRect(slowest.index) };
  return { title: 'Nice work', text: 'This order is done. Keep an eye on the other tickets.', target: null };
}

export function nextStep(run: Run, selected: Ingredient | null): Guide {
  return run.view === 'dining' ? dining(run) : kitchen(run, selected);
}
