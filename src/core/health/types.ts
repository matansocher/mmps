export type ComponentStatus = 'ok' | 'failed';

export type ComponentHealth = {
  readonly name: string;
  readonly status: ComponentStatus;
  readonly reason?: string;
};

export type ReadinessReport = {
  readonly ready: boolean;
  readonly components: readonly ComponentHealth[];
};
