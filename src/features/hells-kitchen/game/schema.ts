import { z } from 'zod';
import { INGREDIENTS, RECIPES } from './content';
import type { Profile, Save } from './types';

const integer = (min: number, max: number) => z.number().int().min(min).max(max);
const bounded = (max: number) => z.number().finite().min(0).max(max);
const ingredient = z.enum(['vegetables', 'grain', 'chicken', 'fish', 'beef', 'dairy', 'fruit']);
const dishSchema = z.object({
  id: integer(1, 100000),
  recipeId: integer(0, 34),
  loaded: z.array(ingredient).max(3),
  state: z.enum(['raw', 'cooking', 'ready', 'plated', 'burnt']),
  elapsed: bounded(100000),
  quality: bounded(5),
});
const orderSchema = z.object({ id: integer(1, 100000), tableId: integer(0, 4), kitchen: z.enum(['blue', 'red']), dishes: z.array(dishSchema).min(1).max(3) });
const tableSchema = z.object({
  id: integer(0, 4),
  stage: z.enum(['empty', 'reading', 'order', 'waiting', 'eating', 'clear']),
  guests: integer(0, 3),
  appearance: integer(1, 3),
  patience: z.number().finite().min(-1).max(1000),
  elapsed: bounded(100000),
  course: integer(0, 3),
});
export const runSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1).max(100),
    mode: z.enum(['career', 'arcade']),
    day: integer(1, 36),
    random: integer(0, 4294967295),
    tick: integer(0, 10000000),
    status: z.enum(['running', 'paused', 'won', 'lost']),
    view: z.enum(['dining', 'blue', 'red']),
    anger: bounded(100),
    completed: integer(0, 10000),
    served: integer(0, 10000),
    qualityTotal: bounded(50000),
    arrivals: integer(0, 10000),
    waiting: integer(0, 100),
    waitingPatience: z.number().finite().min(-1).max(1000),
    nextArrival: bounded(1000000),
    tables: z.array(tableSchema).length(5),
    orders: z.array(orderSchema).max(5),
    selectedOrder: integer(1, 100000).nullable(),
    bowls: z.object({ vegetables: z.boolean(), grain: z.boolean(), chicken: z.boolean(), fish: z.boolean(), beef: z.boolean(), dairy: z.boolean(), fruit: z.boolean() }),
    prepQueue: z.array(ingredient).max(7),
    prepElapsed: bounded(1.5),
    waiterQueue: z.array(z.object({ target: integer(0, 4), action: z.enum(['seat', 'order', 'serve', 'clear']) })).max(5),
    waiterElapsed: bounded(1.3),
    waiterTable: integer(-1, 4),
    nextId: integer(1, 100000),
    tutorial: integer(-1, 5),
    feedback: z.object({
      id: integer(0, 1000000),
      kind: z.enum(['info', 'good', 'warning', 'bad']),
      text: z.string().max(300),
      cue: z.enum(['click', 'ready', 'serve', 'burn', 'arrival', 'success', 'failure']),
    }),
  })
  .superRefine((run, ctx) => {
    const bad = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    if (run.tables.some((t, i) => t.id !== i)) bad('Invalid table sequence');
    if (new Set(run.prepQueue).size !== run.prepQueue.length || run.prepQueue.some((i) => run.bowls[i])) bad('Invalid preparation queue');
    if (new Set(run.waiterQueue.map((t) => t.target)).size !== run.waiterQueue.length) bad('Duplicate waiter task');
    const ids = run.orders.flatMap((o) => [o.id, ...o.dishes.map((d) => d.id)]);
    if (new Set(ids).size !== ids.length || ids.some((id) => id >= run.nextId)) bad('Invalid entity IDs');
    if (new Set(run.orders.map((o) => o.tableId)).size !== run.orders.length) bad('Duplicate table order');
    if (run.selectedOrder !== null && !run.orders.some((o) => o.id === run.selectedOrder)) bad('Unknown selected order');
    for (const order of run.orders) {
      if (run.tables[order.tableId].stage !== 'waiting') bad('Order without waiting table');
      for (const dish of order.dishes) {
        const required = RECIPES[dish.recipeId].ingredients;
        if (new Set(dish.loaded).size !== dish.loaded.length || dish.loaded.some((i) => !required.includes(i))) bad('Invalid dish ingredients');
        if (['cooking', 'ready', 'plated'].includes(dish.state) && dish.loaded.length !== required.length) bad('Incomplete cooking dish');
      }
    }
    for (const i of INGREDIENTS) if (typeof run.bowls[i] !== 'boolean') bad('Invalid bowl');
  });

export const profileSchema = z.object({
  schemaVersion: z.literal(1),
  stars: z.record(z.string().regex(/^(?:[1-9]|[12][0-9]|3[0-6])$/), integer(1, 5)),
  unlockedDay: integer(1, 36),
  arcadeBest: integer(0, 10000),
  tutorialDone: z.boolean(),
  activeRun: runSchema.nullable(),
  completedRunIds: z.array(z.string().min(1).max(100)).max(100),
});
export const saveBodySchema = z.object({ revision: integer(0, Number.MAX_SAFE_INTEGER), profile: profileSchema });

export function parseProfile(value: unknown): Profile | null {
  const result = profileSchema.safeParse(value);
  return result.success ? (result.data as Profile) : null;
}
export function parseSave(value: unknown): Save | null {
  const result = saveBodySchema.extend({ updatedAt: z.string().datetime().nullable() }).safeParse(value);
  return result.success ? (result.data as Save) : null;
}
