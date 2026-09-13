export type Point = {
  readonly x: number;
  readonly y: number;
};

export type RailNode = Point & {
  readonly id: string;
  readonly kind: 'depot' | 'switch' | 'station';
  readonly color?: number;
  readonly outputs: readonly string[];
};

export type RailEdge = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly points: readonly Point[];
  readonly entryDirection?: Point; // Incoming unit tangent at a switch center.
};

export type Level = {
  readonly id: string;
  readonly name: string;
  readonly family: 'Corridor' | 'Scattered';
  readonly difficulty: 'Easy' | 'Medium' | 'Hard';
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly RailNode[];
  readonly edges: readonly RailEdge[];
  readonly depot: string;
  readonly speed: number;
  readonly spawnEvery: number;
};

export const COLORS = [
  { id: 'blue', hex: '#168bff', ink: '#071b2c' },
  { id: 'yellow', hex: '#ffe13d', ink: '#182116' },
  { id: 'pink', hex: '#ff54b0', ink: '#281321' },
  { id: 'purple', hex: '#ac79ff', ink: '#21142f' },
  { id: 'white', hex: '#f7f9fc', ink: '#182116' },
  { id: 'green', hex: '#5bea4e', ink: '#182116' },
] as const;
