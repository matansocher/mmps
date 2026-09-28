import { describe, expect, it, vi } from 'vitest';
import { RunClock } from './run-clock';

describe('shared game clock', () => {
  it('freezes timed reveals, intervals, and motion while paused', () => {
    const clock = new RunClock();
    const reveal = vi.fn(),
      timer = vi.fn(),
      motion = vi.fn();
    clock.setTimeout(reveal, 1000);
    clock.setInterval(timer, 100);
    clock.requestAnimationFrame(motion);
    clock.advance(80);
    clock.setPaused(true);
    clock.advance(60000);
    expect(clock.now()).toBe(80);
    expect(reveal).not.toHaveBeenCalled();
    expect(timer).not.toHaveBeenCalled();
    expect(motion).toHaveBeenCalledTimes(1);
    clock.setPaused(false);
    clock.advance(920);
    expect(reveal).toHaveBeenCalledOnce();
    expect(timer).toHaveBeenCalledOnce();
  });
  it('counts a rendering delay while active and cancels pending callbacks', () => {
    const clock = new RunClock(),
      finish = vi.fn();
    const id = clock.setTimeout(finish, 20);
    clock.clearTimeout(id);
    clock.advance(2000);
    expect(clock.now()).toBe(2000);
    expect(finish).not.toHaveBeenCalled();
  });
});
