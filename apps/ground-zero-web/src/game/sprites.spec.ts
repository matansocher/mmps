import { describe, expect, it } from 'vitest';
import { SPRITE_URLS } from './sprites';

describe('procedural sprites', () => {
  it('provides an SVG data URL for every sprite', () => {
    expect(Object.keys(SPRITE_URLS)).toHaveLength(16);
    for (const url of Object.values(SPRITE_URLS)) expect(url.startsWith('data:image/svg+xml')).toEqual(true);
  });

  it('creates distinct directional character sprites', () => {
    expect(new Set([SPRITE_URLS['player-up'], SPRITE_URLS['player-right'], SPRITE_URLS['player-down'], SPRITE_URLS['player-left']]).size).toEqual(4);
    expect(new Set([SPRITE_URLS['guard-up'], SPRITE_URLS['guard-right'], SPRITE_URLS['guard-down'], SPRITE_URLS['guard-left']]).size).toEqual(4);
  });

  it('creates visually distinct locked and open exits', () => {
    expect(SPRITE_URLS['exit-locked']).not.toEqual(SPRITE_URLS['exit-open']);
  });
});
