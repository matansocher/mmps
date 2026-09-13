import type { Point, RailEdge } from './model';

type Segment = {
  readonly start: Point;
  readonly end: Point;
  readonly control?: Point;
  readonly control2?: Point;
  readonly offset: number;
  readonly length: number;
  readonly samples: readonly number[];
};

type Geometry = {
  readonly path: string;
  readonly length: number;
  readonly segments: readonly Segment[];
};

const cache = new WeakMap<RailEdge, Geometry>();
const RADIUS = 20;
const SAMPLES = 256;

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function mix(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function pointAt(start: Point, end: Point, control: Point | undefined, t: number, control2?: Point): Point {
  if (control && control2) return mix(pointAt(start, control2, control, t), pointAt(control, end, control2, t), t);
  return control ? mix(mix(start, control, t), mix(control, end, t), t) : mix(start, end, t);
}

function geometry(edge: RailEdge): Geometry {
  const cached = cache.get(edge);
  if (cached) return cached;
  if (edge.points.length < 2) throw new Error(`Edge ${edge.id} needs at least two points`);
  edge.points.forEach((point, index) => {
    const previous = edge.points[index - 1];
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`Invalid coordinates on ${edge.id}`);
    if (previous && (distance(previous, point) === 0 || (previous.x !== point.x && previous.y !== point.y))) {
      throw new Error(`Edge ${edge.id} must contain nonzero orthogonal segments`);
    }
    const next = edge.points[index + 1];
    if (previous && next && (point.x - previous.x) * (next.x - point.x) + (point.y - previous.y) * (next.y - point.y) < 0) {
      throw new Error(`Edge ${edge.id} reverses direction`);
    }
  });

  let cursor = edge.points[0];
  let length = 0;
  let path = `M ${cursor.x} ${cursor.y}`;
  const segments: Segment[] = [];
  const append = (end: Point, control?: Point, control2?: Point) => {
    if (distance(cursor, end) === 0) return;
    const samples = [0];
    let previous = cursor;
    const count = control ? SAMPLES : 1;
    for (let i = 1; i <= count; i++) {
      const point = pointAt(cursor, end, control, i / count, control2);
      samples.push(samples[i - 1] + distance(previous, point));
      previous = point;
    }
    const segmentLength = samples[count];
    segments.push({ start: cursor, end, control, control2, offset: length, length: segmentLength, samples });
    length += segmentLength;
    path += control && control2 ? ` C ${control.x} ${control.y} ${control2.x} ${control2.y} ${end.x} ${end.y}` : control ? ` Q ${control.x} ${control.y} ${end.x} ${end.y}` : ` L ${end.x} ${end.y}`;
    cursor = end;
  };
  if (edge.entryDirection) {
    const incoming = edge.entryDirection;
    const outgoing = { x: Math.sign(edge.points[1].x - cursor.x), y: Math.sign(edge.points[1].y - cursor.y) };
    if (![incoming.x, incoming.y].every((value) => [-1, 0, 1].includes(value)) || Math.abs(incoming.x) + Math.abs(incoming.y) !== 1) throw new Error(`Invalid entry direction on ${edge.id}`);
    const alignment = incoming.x * outgoing.x + incoming.y * outgoing.y;
    if (alignment < 0) throw new Error(`Edge ${edge.id} reverses its entry direction`);
    if (alignment === 0) {
      const reach = Math.min(26, distance(cursor, edge.points[1]) / 2);
      append(
        { x: cursor.x + outgoing.x * reach, y: cursor.y + outgoing.y * reach },
        { x: cursor.x + incoming.x * reach * 0.46, y: cursor.y + incoming.y * reach * 0.46 },
        { x: cursor.x + outgoing.x * reach * 0.77, y: cursor.y + outgoing.y * reach * 0.77 },
      );
    }
  }
  for (let i = 1; i < edge.points.length - 1; i++) {
    const previous = edge.points[i - 1];
    const corner = edge.points[i];
    const next = edge.points[i + 1];
    if ((previous.x === corner.x && corner.x === next.x) || (previous.y === corner.y && corner.y === next.y)) {
      append(corner);
      continue;
    }
    const radius = Math.min(RADIUS, distance(previous, corner) / 2, distance(corner, next) / 2);
    append(mix(corner, previous, radius / distance(previous, corner)));
    append(mix(corner, next, radius / distance(corner, next)), corner);
  }
  append(edge.points[edge.points.length - 1]);
  const result = { path, length, segments };
  cache.set(edge, result);
  return result;
}

export function edgePath(edge: RailEdge): string {
  return geometry(edge).path;
}

export function edgeLength(edge: RailEdge): number {
  return geometry(edge).length;
}

export function edgePosition(edge: RailEdge, distanceAlong: number): Point & { readonly angle: number } {
  if (!Number.isFinite(distanceAlong)) throw new Error('Train distance must be finite');
  const { segments, length } = geometry(edge);
  const target = Math.max(0, Math.min(length, distanceAlong));
  const segment = segments.find((part) => target <= part.offset + part.length) ?? segments[segments.length - 1];
  const local = target - segment.offset;
  let t = local / segment.length;
  if (segment.control) {
    const index = Math.max(
      1,
      segment.samples.findIndex((sample) => sample >= local),
    );
    const before = segment.samples[index - 1];
    t = (index - 1 + (local - before) / (segment.samples[index] - before)) / SAMPLES;
  }
  const { start, end, control, control2 } = segment;
  const tangent =
    control && control2
      ? {
          x: (1 - t) ** 2 * (control.x - start.x) + 2 * t * (1 - t) * (control2.x - control.x) + t ** 2 * (end.x - control2.x),
          y: (1 - t) ** 2 * (control.y - start.y) + 2 * t * (1 - t) * (control2.y - control.y) + t ** 2 * (end.y - control2.y),
        }
      : control
        ? { x: (1 - t) * (control.x - start.x) + t * (end.x - control.x), y: (1 - t) * (control.y - start.y) + t * (end.y - control.y) }
        : { x: end.x - start.x, y: end.y - start.y };
  return { ...pointAt(start, end, control, t, control2), angle: (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI };
}
