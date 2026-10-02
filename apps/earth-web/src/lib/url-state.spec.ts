import { describe, expect, it } from 'vitest';
import { decodeView, encodeView } from './url-state';

describe('url-state', () => {
  it('round-trips a camera view', () => {
    const view = { lat: 31.776719, lon: 35.234508, altitude: 1500, heading: 45, pitch: -30 };
    const hash = encodeView(view);
    expect(hash).toEqual('@31.776719,35.234508,1500a,45.0h,60.0t');
    expect(decodeView(`#${hash}`)).toEqual(view);
  });

  it('normalizes negative headings', () => {
    expect(encodeView({ lat: 0, lon: 0, altitude: 10, heading: -90, pitch: -90 })).toEqual('@0.000000,0.000000,10a,270.0h,0.0t');
  });

  it('defaults heading and tilt', () => {
    expect(decodeView('@10,20,3000a')).toEqual({ lat: 10, lon: 20, altitude: 3000, heading: 0, pitch: -90 });
  });

  it.each(['', '#foo', '@95,0,100a', '@0,0,0a', '@0,0,100a,0h,120t'])('rejects "%s"', (hash) => {
    expect(decodeView(hash)).toBeNull();
  });
});
