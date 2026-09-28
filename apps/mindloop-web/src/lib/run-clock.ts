type Job = { readonly callback: (time: number) => void; readonly interval: number; readonly frame: boolean; due: number };
// Every game uses this clock, so timers, previews and movement freeze together.
export class RunClock {
  private time = 0;
  private id = 0;
  private jobs = new Map<number, Job>();
  private paused = false;
  isPaused = (): boolean => this.paused;
  now = (): number => this.time;
  setPaused = (paused: boolean): void => {
    this.paused = paused;
  };
  advance = (elapsed: number): void => {
    if (this.paused) return;
    this.time += Math.max(0, elapsed);
    for (const [id, job] of [...this.jobs]) {
      if (!this.jobs.has(id) || job.due > this.time) continue;
      if (job.interval) job.due = this.time + job.interval;
      else this.jobs.delete(id);
      job.callback(this.time);
    }
  };
  setTimeout = (callback: () => void, delay = 0): number => {
    const id = ++this.id;
    this.jobs.set(id, { callback, interval: 0, frame: false, due: this.time + delay });
    return id;
  };
  clearTimeout = (id?: number): void => {
    if (id !== undefined) this.jobs.delete(id);
  };
  setInterval = (callback: () => void, delay: number): number => {
    const id = ++this.id;
    this.jobs.set(id, { callback, interval: Math.max(1, delay), frame: false, due: this.time + delay });
    return id;
  };
  clearInterval = this.clearTimeout;
  requestAnimationFrame = (callback: (time: number) => void): number => {
    const id = ++this.id;
    this.jobs.set(id, { callback, interval: 0, frame: true, due: this.time });
    return id;
  };
  cancelAnimationFrame = this.clearTimeout;
  clear = (): void => {
    this.jobs.clear();
  };
}
