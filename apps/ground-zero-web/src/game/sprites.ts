import type { Direction } from './types';
import { createDoorSprite, createExitSprite, createGuardSprite, createHidingSprite, createKeycardSprite, createObjectiveSprite, createPlayerSprite, createVentSprite } from './procedural-sprites';

export type SpriteId = `player-${Direction}` | `guard-${Direction}` | 'objective' | 'exit-locked' | 'exit-open' | 'hiding' | 'keycard' | 'door-locked' | 'door-open' | 'vent';

export const SPRITE_URLS: Readonly<Record<SpriteId, string>> = {
  'player-up': createPlayerSprite('up'),
  'player-right': createPlayerSprite('right'),
  'player-down': createPlayerSprite('down'),
  'player-left': createPlayerSprite('left'),
  'guard-up': createGuardSprite('up'),
  'guard-right': createGuardSprite('right'),
  'guard-down': createGuardSprite('down'),
  'guard-left': createGuardSprite('left'),
  objective: createObjectiveSprite(),
  'exit-locked': createExitSprite(true),
  'exit-open': createExitSprite(false),
  hiding: createHidingSprite(),
  keycard: createKeycardSprite(),
  'door-locked': createDoorSprite(false),
  'door-open': createDoorSprite(true),
  vent: createVentSprite(),
};

const imageCache = new Map<string, HTMLImageElement>();

export function spriteImage(id: SpriteId): HTMLImageElement | null {
  const url = SPRITE_URLS[id];
  if (!url) return null;
  const cached = imageCache.get(url);
  if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;

  const image = new Image();
  image.src = url;
  imageCache.set(url, image);
  return null;
}
