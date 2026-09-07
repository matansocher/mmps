import type { ComponentHealth, ReadinessReport } from './types';

// Tracks the components that must be able to serve for the process to be
// considered "ready". Liveness (the process is up) is separate from readiness
// (the process can actually do its job): a component may start successfully and
// later stop serving - e.g. a bot whose long-running poller terminates - which
// must flip readiness even though the process stays alive.
const components = new Map<string, ComponentHealth>();

export function markComponentReady(name: string): void {
  components.set(name, { name, status: 'ok' });
}

export function markComponentFailed(name: string, reason?: string): void {
  components.set(name, { name, status: 'failed', reason });
}

export function getReadinessReport(): ReadinessReport {
  const list = [...components.values()];
  const ready = list.every((component) => component.status === 'ok');
  return { ready, components: list };
}

export function resetHealthRegistry(): void {
  components.clear();
}
