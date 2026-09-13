import { assert, describe, expect, it } from 'vitest';
import { createRun, initialSwitches } from './engine';
import { edgeLength, edgePosition } from './geometry';
import { LEVELS } from './levels';
import { COLORS, type Point } from './model';

type Line = {
  readonly edgeId: string;
  readonly from: string;
  readonly to: string;
  readonly a: Point;
  readonly b: Point;
};

function intersection(a: Line, b: Line): Point | 'overlap' | undefined {
  const left = Math.max(Math.min(a.a.x, a.b.x), Math.min(b.a.x, b.b.x));
  const right = Math.min(Math.max(a.a.x, a.b.x), Math.max(b.a.x, b.b.x));
  const top = Math.max(Math.min(a.a.y, a.b.y), Math.min(b.a.y, b.b.y));
  const bottom = Math.min(Math.max(a.a.y, a.b.y), Math.max(b.a.y, b.b.y));
  if (left > right || top > bottom) return;
  if (left !== right || top !== bottom) return 'overlap';
  return { x: left, y: top };
}

describe('hand-authored railway boards', () => {
  it('provides three increasing difficulties in each family, with stable distinct colors', () => {
    expect(LEVELS).toHaveLength(6);
    expect(new Set(LEVELS.map((level) => level.id)).size).toEqual(6);
    for (const family of ['Corridor', 'Scattered']) {
      const levels = LEVELS.filter((level) => level.family === family);
      expect(levels.map((level) => level.difficulty)).toEqual(['Easy', 'Medium', 'Hard']);
      expect(levels.map((level) => level.nodes.filter((node) => node.kind === 'station').length)).toEqual([4, 5, 6]);
      expect(levels.map((level) => level.nodes.filter((node) => node.kind === 'switch').length)).toEqual([3, 4, 5]);
      expect(levels[0].spawnEvery).toBeGreaterThan(levels[1].spawnEvery);
      expect(levels[1].spawnEvery).toBeGreaterThan(levels[2].spawnEvery);
    }
    expect(COLORS.map((color) => color.id)).toEqual(['blue', 'yellow', 'pink', 'purple', 'white', 'green']);
    expect(new Set(COLORS.map((color) => color.hex)).size).toEqual(6);
    const luminance = (hex: string) => {
      const pairs = hex.slice(1).match(/../g);
      assert(pairs);
      const values = pairs.map((part) => parseInt(part, 16) / 255).map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    for (const color of COLORS) expect((luminance(color.hex) + 0.05) / (luminance(color.ink) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(LEVELS)('$id is a rooted terminal tree with room for touch targets and a long depot approach', (level) => {
    expect(() => createRun(level, () => 0)).not.toThrow();
    expect(level.width).toEqual(600);
    expect(level.height).toEqual(440);
    const depot = level.nodes.find((node) => node.id === level.depot);
    assert(depot);
    expect(depot.kind).toEqual('depot');
    expect(depot.x).toBeGreaterThanOrEqual(500);
    expect(depot.y).toBeGreaterThanOrEqual(380);
    const approach = level.edges.find((edge) => edge.id === depot.outputs[0]);
    assert(approach);
    const approachTime = edgeLength(approach) / level.speed;
    expect(approachTime).toBeGreaterThanOrEqual(2.4);
    expect(approachTime).toBeLessThanOrEqual(2.8);
    expect(level.speed).toBeGreaterThanOrEqual(45);
    expect(level.speed).toBeLessThanOrEqual(50);
    expect(level.edges).toHaveLength(level.nodes.length - 1);
    expect(Object.keys(initialSwitches(level))).toHaveLength(level.nodes.filter((node) => node.kind === 'switch').length);
    for (const node of level.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(48);
      expect(node.x).toBeLessThanOrEqual(level.width - 48);
      expect(node.y).toBeGreaterThanOrEqual(48);
      expect(node.y).toBeLessThanOrEqual(level.height - 48);
      if (node.kind === 'switch') {
        expect(node.outputs).toHaveLength(2);
        const exits = node.outputs.map((id) => {
          const edge = level.edges.find((edge) => edge.id === id);
          assert(edge);
          return edgePosition(edge, 26);
        });
        const angleDifference = Math.abs(((exits[0].angle - exits[1].angle + 540) % 360) - 180);
        expect(angleDifference).toBeGreaterThanOrEqual(90);
        expect(Math.hypot(exits[0].x - exits[1].x, exits[0].y - exits[1].y)).toBeGreaterThanOrEqual(32);
        for (const other of level.nodes.filter((other) => other.kind === 'switch' && other.id !== node.id)) {
          expect(Math.hypot(node.x - other.x, node.y - other.y)).toBeGreaterThanOrEqual(96);
        }
      }
      if (node.kind === 'station') {
        expect(node.outputs).toEqual([]);
        for (const other of level.nodes.filter((other) => other.id !== node.id)) {
          expect(Math.hypot(node.x - other.x, node.y - other.y)).toBeGreaterThanOrEqual(60);
        }
      }
    }
  });

  it.each(LEVELS)('$id has no track crossing or overlap except at a shared node', (level) => {
    const lines: Line[] = level.edges.flatMap((edge) => edge.points.slice(1).map((b, index) => ({ edgeId: edge.id, from: edge.from, to: edge.to, a: edge.points[index], b })));
    lines.forEach((line, index) => {
      for (const other of lines.slice(index + 1)) {
        if (line.edgeId === other.edgeId) continue;
        const crossing = intersection(line, other);
        if (!crossing) continue;
        expect(crossing, `${line.edgeId} overlaps ${other.edgeId}`).not.toEqual('overlap');
        const shared = level.nodes.find((node) => [line.from, line.to].includes(node.id) && [other.from, other.to].includes(node.id));
        assert(shared, `${line.edgeId} crosses ${other.edgeId}`);
        expect(crossing).toEqual({ x: shared.x, y: shared.y });
      }
      for (const node of level.nodes) {
        if ([line.from, line.to].includes(node.id)) continue;
        const closest = {
          x: Math.max(Math.min(line.a.x, line.b.x), Math.min(Math.max(line.a.x, line.b.x), node.x)),
          y: Math.max(Math.min(line.a.y, line.b.y), Math.min(Math.max(line.a.y, line.b.y), node.y)),
        };
        expect(Math.hypot(node.x - closest.x, node.y - closest.y), `${line.edgeId} passes too close to ${node.id}`).toBeGreaterThanOrEqual(node.kind === 'station' ? 60 : 32);
      }
    });
  });
});
