import { menuFor } from '../../../../src/features/hells-kitchen/game/engine';
import type { Ingredient, Run } from '../../../../src/features/hells-kitchen/game/types';

export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

// Seat anchors for each dining table and the blue table lamp painted into the dining art.
export const TABLES = [
  [342, 258],
  [582, 270],
  [337, 392],
  [614, 400],
  [484, 525],
] as const;
export const LAMPS = [
  [349, 217],
  [586, 225],
  [335, 331],
  [617, 337],
  [483, 459],
] as const;
export const BURNERS = [355, 500, 646] as const;
export const POT_Y = 280;
export const PLATE_Y = 168;
export const BOWL_Y = 490;
export const PILE_Y = 452;
export const MAX_TICKETS = 5;

// The counter order follows the original game: poultry, meat, seafood, produce, then dairy and grains.
const COUNTER_ORDER: readonly Ingredient[] = ['chicken', 'beef', 'fish', 'vegetables', 'fruit', 'dairy', 'grain'];

export function pantryFor(run: Run): readonly Ingredient[] {
  const used = new Set(menuFor(run.day, run.mode).flatMap((r) => r.ingredients));
  return COUNTER_ORDER.filter((i) => used.has(i));
}

export const bowlX = (index: number, count: number): number => {
  const left = 170;
  const right = 680;
  return count <= 1 ? (left + right) / 2 : left + ((right - left) * index) / (count - 1);
};
export const bowlRect = (index: number, count: number): Rect => ({ x: bowlX(index, count) - 40, y: BOWL_Y - 30, w: 80, h: 56 });
export const pileRect = (index: number, count: number): Rect => ({ x: bowlX(index, count) - 38, y: PILE_Y - 24, w: 76, h: 34 });
export const potRect = (index: number): Rect => ({ x: BURNERS[index] - 52, y: POT_Y - 48, w: 104, h: 74 });
export const bubbleRect = (index: number): Rect => ({ x: BURNERS[index] - 46, y: POT_Y - 98, w: 92, h: 44 });
export const plateRect = (index: number): Rect => ({ x: BURNERS[index] - 48, y: PLATE_Y - 20, w: 96, h: 38 });
export const timerRect = (index: number): Rect => ({ x: BURNERS[index] + 50, y: POT_Y - 22, w: 40, h: 30 });
export const ticketRect = (index: number): Rect => ({ x: 238 + index * 60, y: 8, w: 54, h: 66 });
export const tableRect = (index: number): Rect => ({ x: TABLES[index][0] - 70, y: LAMPS[index][1] - 40, w: 140, h: TABLES[index][1] - LAMPS[index][1] + 70 });

export const PORTRAIT_RECT: Rect = { x: 12, y: 8, w: 164, h: 214 };
export const MENU_RECT: Rect = { x: 22, y: 226, w: 144, h: 28 };
export const METER_RECT: Rect = { x: 190, y: 44, w: 14, h: 208 };
export const TRASH_RECT: Rect = { x: 26, y: 500, w: 96, h: 100 };
export const RECEPTION_RECT: Rect = { x: 640, y: 150, w: 158, h: 118 };
export const PASS_Y = 574;
export const SWITCH_RECTS = {
  dining: { x: 8, y: 318, w: 48, h: 100 },
  kitchen: { x: 744, y: 318, w: 48, h: 100 },
} as const satisfies Record<string, Rect>;
// Platters sit either side of the HK plate in the middle of the pass.
export const passRect = (index: number): Rect => {
  const x = [300, 500, 208, 592][index] ?? 400;
  return { x: x - 40, y: PASS_Y - 34, w: 80, h: 48 };
};
