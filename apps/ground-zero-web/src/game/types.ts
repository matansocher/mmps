export type Position = {
  readonly row: number;
  readonly column: number;
};

export type Direction = 'up' | 'right' | 'down' | 'left';
export type GuardBehavior = 'patrol' | 'sentry';
export type GuardMode = 'routine' | 'investigate' | 'search' | 'return';
export type TileType = 'empty' | 'wall' | 'objective' | 'exit' | 'hiding' | 'keycard' | 'door' | 'vent';
export type GameStatus = 'ready' | 'playing' | 'caught' | 'completed';
export type InteractionKind = 'keycard' | 'door-locked' | 'vent';

export type Tile = {
  readonly type: TileType;
};

export type PatrolGuardDefinition = {
  readonly id: string;
  readonly behavior: 'patrol';
  readonly patrol: readonly Position[];
  readonly moveEveryTicks?: number;
};

export type SentryGuardDefinition = {
  readonly id: string;
  readonly behavior: 'sentry';
  readonly position: Position;
  readonly facingSequence: readonly Direction[];
  readonly rotateEveryTicks: number;
};

export type GuardDefinition = PatrolGuardDefinition | SentryGuardDefinition;

export type VentPair = {
  readonly first: Position;
  readonly second: Position;
};

export type FloorDefinition = {
  readonly id: string;
  readonly name: string;
  readonly template: readonly string[];
  readonly guards: readonly GuardDefinition[];
  readonly visionDepth: number;
  readonly guardMoveEveryTicks: number;
  readonly suspicionPerTick?: number;
  readonly suspicionDecayPerTick?: number;
  readonly playerNoiseRadius?: number;
  readonly searchDurationTicks?: number;
  readonly ventPairs?: readonly VentPair[];
};

export type ParsedFloor = {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly (readonly Tile[])[];
  readonly playerStart: Position;
  readonly guards: readonly GuardDefinition[];
  readonly visionDepth: number;
  readonly guardMoveEveryTicks: number;
  readonly suspicionPerTick: number;
  readonly suspicionDecayPerTick: number;
  readonly playerNoiseRadius: number;
  readonly searchDurationTicks: number;
  readonly ventLinks: Readonly<Record<string, Position>>;
};

export type PlayerState = {
  readonly position: Position;
  readonly direction: Direction;
  readonly hasObjective: boolean;
  readonly hasKeycard: boolean;
  readonly isHidden: boolean;
};

export type PatrolGuardState = {
  readonly id: string;
  readonly behavior: 'patrol';
  readonly position: Position;
  readonly direction: Direction;
  readonly patrol: readonly Position[];
  readonly patrolIndex: number;
  readonly patrolDirection: 1 | -1;
  readonly moveEveryTicks: number;
  readonly mode: GuardMode;
  readonly homePosition: Position;
  readonly investigationTarget: Position | null;
  readonly searchTicksRemaining: number;
};

export type SentryGuardState = {
  readonly id: string;
  readonly behavior: 'sentry';
  readonly position: Position;
  readonly direction: Direction;
  readonly facingSequence: readonly Direction[];
  readonly facingIndex: number;
  readonly rotateEveryTicks: number;
  readonly mode: GuardMode;
  readonly homePosition: Position;
  readonly investigationTarget: Position | null;
  readonly searchTicksRemaining: number;
};

export type GuardState = PatrolGuardState | SentryGuardState;

export type NoiseEvent = {
  readonly position: Position;
  readonly radius: number;
  readonly expiresAtTick: number;
};

export type InteractionEvent = {
  readonly kind: InteractionKind;
  readonly tick: number;
};

export type GameState = {
  readonly floor: ParsedFloor;
  readonly tick: number;
  readonly status: GameStatus;
  readonly player: PlayerState;
  readonly guards: readonly GuardState[];
  readonly suspicion: number;
  readonly noise: NoiseEvent | null;
  readonly interaction: InteractionEvent | null;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
};

export type StepResult = {
  readonly state: GameState;
  readonly objectiveCollected: boolean;
  readonly keycardCollected: boolean;
  readonly ventUsed: boolean;
  readonly doorBlocked: boolean;
};
