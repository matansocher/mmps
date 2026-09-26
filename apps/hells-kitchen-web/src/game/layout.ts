export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export const TABLES = [
  [342, 258],
  [582, 270],
  [337, 392],
  [614, 400],
  [484, 525],
] as const;
export const BURNERS = [354, 500, 646] as const;
export const PAN_Y = 272;
export const MAX_TICKETS = 5;

export const ticketRect = (index: number): Rect => ({ x: 184 + index * 122, y: 57, w: 112, h: 46 });
export const bowlX = (index: number): number => 216 + index * 81;
export const bowlRect = (index: number): Rect => ({ x: bowlX(index) - 38, y: 456, w: 76, h: 95 });
export const panRect = (index: number): Rect => ({ x: BURNERS[index] - 56, y: PAN_Y - 22, w: 112, h: 48 });
export const tableRect = (index: number): Rect => ({ x: TABLES[index][0] - 55, y: TABLES[index][1] - 11, w: 110, h: 37 });
export const GREET_RECT: Rect = { x: 653, y: 129, w: 130, h: 34 };
export const NAV_RECTS = {
  dining: { x: 15, y: 566, w: 146, h: 30 },
  blue: { x: 172, y: 566, w: 146, h: 30 },
  red: { x: 329, y: 566, w: 146, h: 30 },
} as const satisfies Record<string, Rect>;
