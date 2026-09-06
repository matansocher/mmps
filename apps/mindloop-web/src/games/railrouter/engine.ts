import { edgeLength } from './geometry';
import { COLORS, type Level, type RailEdge, type RailNode } from './model';

export const TOTAL_TIME = 90;

export type Train = {
  readonly id: number;
  readonly color: number;
  readonly edgeId: string;
  readonly distance: number;
};

export type Delivery = {
  readonly id: number;
  readonly stationId: string;
  readonly correct: boolean;
  readonly at: number;
};

export type RunState = {
  readonly elapsed: number;
  readonly trains: readonly Train[];
  readonly spawned: number;
  readonly correct: number;
  readonly wrong: number;
  readonly deliveries: readonly Delivery[];
  readonly nextColor: number;
  readonly finished: boolean;
};

export type Switches = Readonly<Record<string, number>>;

type Network = {
  readonly nodes: ReadonlyMap<string, RailNode>;
  readonly edges: ReadonlyMap<string, RailEdge>;
  readonly colors: readonly number[];
};

const networks = new WeakMap<Level, Network>();
const EPSILON = 1e-9;

function requireEntry<T>(entries: ReadonlyMap<string, T>, id: string): T {
  const entry = entries.get(id);
  if (entry === undefined) throw new Error(`Missing railway entry ${id}`);
  return entry;
}

function network(level: Level): Network {
  const cached = networks.get(level);
  if (cached) return cached;
  const nodes = new Map(level.nodes.map((node) => [node.id, node]));
  const edges = new Map(level.edges.map((edge) => [edge.id, edge]));
  function invalid(reason: string): never {
    throw new Error(`Invalid railway ${level.id}: ${reason}`);
  }
  if (nodes.size !== level.nodes.length || edges.size !== level.edges.length) invalid('duplicate IDs');
  if (!Number.isFinite(level.speed) || level.speed <= 0 || !Number.isFinite(level.spawnEvery) || level.spawnEvery <= 0) invalid('invalid timing');
  if (nodes.get(level.depot)?.kind !== 'depot' || level.nodes.filter((node) => node.kind === 'depot').length !== 1) invalid('expected a single depot');

  const incoming = new Map<string, number>();
  for (const edge of level.edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to || !from.outputs.includes(edge.id)) invalid(`unlinked edge ${edge.id}`);
    edgeLength(edge);
    const start = edge.points[0];
    const end = edge.points[edge.points.length - 1];
    if (start.x !== from.x || start.y !== from.y || end.x !== to.x || end.y !== to.y) invalid(`misaligned edge ${edge.id}`);
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  }
  const colors: number[] = [];
  for (const node of level.nodes) {
    if ((incoming.get(node.id) ?? 0) !== (node.kind === 'depot' ? 0 : 1)) invalid(`not a tree at ${node.id}`);
    if (new Set(node.outputs).size !== node.outputs.length || node.outputs.some((id) => edges.get(id)?.from !== node.id)) invalid(`invalid outputs at ${node.id}`);
    if (node.kind === 'station') {
      if (node.outputs.length || node.color === undefined || !Number.isInteger(node.color) || !COLORS[node.color]) invalid(`invalid station ${node.id}`);
      colors.push(node.color);
    } else if (node.outputs.length !== (node.kind === 'depot' ? 1 : 2)) invalid(`invalid branching at ${node.id}`);
  }
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) invalid(`cycle at ${id}`);
    visited.add(id);
    for (const output of requireEntry(nodes, id).outputs) visit(requireEntry(edges, output).to);
  };
  visit(level.depot);
  if (visited.size !== nodes.size || !colors.length || new Set(colors).size !== colors.length) invalid('unreachable nodes or duplicate station colors');
  const result = { nodes, edges, colors };
  networks.set(level, result);
  return result;
}

function pickColor(colors: readonly number[], random: () => number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random source must return a value in [0, 1)');
  return colors[Math.floor(value * colors.length)];
}

export function initialSwitches(level: Level): Switches {
  network(level);
  return Object.fromEntries(level.nodes.filter((node) => node.kind === 'switch').map((node) => [node.id, 0]));
}

export function createRun(level: Level, random: () => number = Math.random): RunState {
  return { elapsed: 0, trains: [], spawned: 0, correct: 0, wrong: 0, deliveries: [], nextColor: pickColor(network(level).colors, random), finished: false };
}

export function advanceRun(level: Level, state: RunState, switches: Switches, dt: number, random: () => number = Math.random): RunState {
  if (state.finished) return state;
  if (!Number.isFinite(dt) || dt < 0) throw new Error('Time step must be finite and nonnegative');
  if (dt === 0) return state;
  const { nodes, edges, colors } = network(level);
  for (const node of level.nodes) {
    if (node.kind === 'switch' && (!Number.isInteger(switches[node.id]) || !node.outputs[switches[node.id]])) throw new Error(`Invalid switch selection at ${node.id}`);
  }
  const end = Math.min(TOTAL_TIME, state.elapsed + dt);
  const trains: Train[] = [];
  const deliveries = [...state.deliveries];
  let correct = state.correct;
  let wrong = state.wrong;
  const move = (train: Train, start: number) => {
    let edge = edges.get(train.edgeId);
    if (!edge) throw new Error(`Unknown train edge ${train.edgeId}`);
    let distance = train.distance;
    let time = start;
    while (true) {
      const remaining = edgeLength(edge) - distance;
      const arrival = time + remaining / level.speed;
      if (arrival > end + EPSILON) {
        trains.push({ ...train, edgeId: edge.id, distance: distance + (end - time) * level.speed });
        return;
      }
      const node = requireEntry(nodes, edge.to);
      if (node.kind === 'station') {
        const matches = train.color === node.color;
        deliveries.push({ id: train.id, stationId: node.id, correct: matches, at: Math.min(arrival, end) });
        if (matches) correct++;
        else wrong++;
        return;
      }
      edge = edges.get(node.outputs[switches[node.id]]);
      if (!edge) throw new Error(`Missing route at ${node.id}`);
      distance = 0;
      time = Math.min(arrival, end);
    }
  };
  for (const train of state.trains) move(train, state.elapsed);
  let spawned = state.spawned;
  let nextColor = state.nextColor;
  const depotEdge = requireEntry(nodes, level.depot).outputs[0];
  while (spawned * level.spawnEvery <= end + EPSILON && spawned * level.spawnEvery < TOTAL_TIME) {
    const at = Math.min(spawned * level.spawnEvery, end);
    move({ id: spawned, color: nextColor, edgeId: depotEdge, distance: 0 }, at);
    spawned++;
    nextColor = pickColor(colors, random);
  }
  return {
    elapsed: end,
    trains: trains.sort((a, b) => a.id - b.id),
    spawned,
    correct,
    wrong,
    deliveries: deliveries.filter((delivery) => end - delivery.at <= 0.9 + EPSILON).sort((a, b) => a.at - b.at || a.id - b.id),
    nextColor,
    finished: end === TOTAL_TIME,
  };
}
