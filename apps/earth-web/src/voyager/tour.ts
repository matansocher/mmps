import type { Viewer } from 'cesium';
import { flyToTarget, startOrbit } from '../globe/camera';
import type { VoyagerStop } from './catalog';

export type TourState = {
  readonly index: number;
  readonly total: number;
  readonly stop: VoyagerStop;
  readonly phase: 'flying' | 'orbiting';
};

const ORBIT_MS = 9000;

export class TourPlayer {
  private stopOrbit: (() => void) | null = null;
  private timer = 0;
  private running = false;
  private index = 0;

  private readonly viewer: Viewer;
  private readonly stops: readonly VoyagerStop[];
  private readonly onState: (state: TourState | null) => void;

  constructor(viewer: Viewer, stops: readonly VoyagerStop[], onState: (state: TourState | null) => void) {
    this.viewer = viewer;
    this.stops = stops;
    this.onState = onState;
  }

  async play(fromIndex = 0): Promise<void> {
    this.running = true;
    this.index = fromIndex;
    await this.visit();
  }

  next(): void {
    if (this.index < this.stops.length - 1) void this.jump(this.index + 1);
  }

  previous(): void {
    if (this.index > 0) void this.jump(this.index - 1);
  }

  stop(): void {
    this.running = false;
    this.clearTimers();
    this.viewer.camera.cancelFlight();
    this.onState(null);
  }

  private async jump(index: number): Promise<void> {
    this.clearTimers();
    this.index = index;
    this.running = true;
    await this.visit();
  }

  private clearTimers(): void {
    window.clearTimeout(this.timer);
    this.stopOrbit?.();
    this.stopOrbit = null;
  }

  private async visit(): Promise<void> {
    const stop = this.stops[this.index];
    const index = this.index;
    this.onState({ index, total: this.stops.length, stop, phase: 'flying' });
    const completed = await flyToTarget(this.viewer, stop, 5);
    if (!this.running || index !== this.index) return;
    if (!completed) {
      this.stop();
      return;
    }
    this.onState({ index, total: this.stops.length, stop, phase: 'orbiting' });
    this.stopOrbit = startOrbit(this.viewer, stop, 5);
    const orbitStop = this.stopOrbit;
    // User interaction cancels the orbit; treat it as stopping the tour.
    const canvas = this.viewer.scene.canvas;
    const onInteract = () => {
      if (this.stopOrbit === orbitStop) this.stop();
    };
    canvas.addEventListener('pointerdown', onInteract, { once: true });
    canvas.addEventListener('wheel', onInteract, { once: true });
    this.timer = window.setTimeout(() => {
      canvas.removeEventListener('pointerdown', onInteract);
      canvas.removeEventListener('wheel', onInteract);
      if (!this.running || index !== this.index) return;
      this.clearTimers();
      if (this.index < this.stops.length - 1) {
        this.index += 1;
        void this.visit();
      } else {
        this.stop();
      }
    }, ORBIT_MS);
  }
}
