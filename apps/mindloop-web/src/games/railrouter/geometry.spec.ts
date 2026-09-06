import { assert, describe, expect, it } from 'vitest';
import { edgeLength, edgePath, edgePosition } from './geometry';
import { LEVELS } from './levels';
import type { RailEdge } from './model';

const bend: RailEdge = {
  id: 'bend',
  from: 'a',
  to: 'b',
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ],
};

describe('shared railway geometry', () => {
  it('uses one rounded quadratic for both path rendering and arc-length train positions', () => {
    expect(edgePath(bend)).toEqual('M 0 0 L 80 0 Q 100 0 100 20 L 100 100');
    expect(edgeLength(bend)).toBeGreaterThan(192);
    expect(edgeLength(bend)).toBeLessThan(193);
    const position = edgePosition(bend, edgeLength(bend) / 2);
    expect(position.x).toBeCloseTo(95, 6);
    expect(position.y).toBeCloseTo(5, 6);
    expect(position.angle).toBeCloseTo(45, 6);
    expect(edgePosition(bend, 79.99).angle).toEqual(0);
    expect(edgePosition(bend, 80.01).angle).toBeLessThan(0.1);
    const curveEnd = edgeLength(bend) - 80;
    expect(edgePosition(bend, curveEnd - 0.01).angle).toBeGreaterThan(89.9);
    expect(edgePosition(bend, curveEnd + 0.01).angle).toEqual(90);
  });

  it.each(LEVELS)('$id has exact endpoints and continuous positions and headings on every edge', (level) => {
    for (const edge of level.edges) {
      const length = edgeLength(edge);
      const first = edge.points[0];
      const last = edge.points[edge.points.length - 1];
      expect(edgePosition(edge, 0)).toMatchObject(first);
      const end = edgePosition(edge, length);
      expect(end.x).toBeCloseTo(last.x, 9);
      expect(end.y).toBeCloseTo(last.y, 9);
      expect(edgePosition(edge, -10)).toEqual(edgePosition(edge, 0));
      expect(edgePosition(edge, length + 10)).toEqual(end);
      expect(edgePath(edge)).not.toContain('NaN');
      let previous = edgePosition(edge, 0);
      for (let distance = 0.25; distance < length; distance += 0.25) {
        const current = edgePosition(edge, distance);
        expect(Math.hypot(current.x - previous.x, current.y - previous.y)).toBeLessThan(0.251);
        expect(Math.abs(((current.angle - previous.angle + 540) % 360) - 180)).toBeLessThan(4);
        previous = current;
      }
    }
  });

  it.each(LEVELS)('$id preserves the incoming heading through every switch center', (level) => {
    for (const node of level.nodes.filter((node) => node.kind === 'switch')) {
      const incoming = level.edges.find((edge) => edge.to === node.id);
      assert(incoming);
      const arrival = edgePosition(incoming, edgeLength(incoming));
      for (const id of node.outputs) {
        const outgoing = level.edges.find((edge) => edge.id === id);
        assert(outgoing);
        const departure = edgePosition(outgoing, 0);
        expect(departure.x).toEqual(arrival.x);
        expect(departure.y).toEqual(arrival.y);
        expect(Math.abs(((departure.angle - arrival.angle + 540) % 360) - 180)).toBeLessThan(1e-8);
        const justDeparted = edgePosition(outgoing, 0.001);
        expect(Math.abs(((justDeparted.angle - arrival.angle + 540) % 360) - 180)).toBeLessThan(0.1);
        for (let distance = 0; distance <= 26; distance++) {
          const point = edgePosition(outgoing, distance);
          expect(Math.hypot(point.x - node.x, point.y - node.y)).toBeLessThanOrEqual(26.001);
        }
      }
    }
  });

  it('uses right-facing degree angles in all four directions', () => {
    for (const [x, y, angle] of [
      [100, 0, 0],
      [0, 100, 90],
      [-100, 0, 180],
      [0, -100, -90],
    ]) {
      const edge = {
        ...bend,
        points: [
          { x: 0, y: 0 },
          { x, y },
        ],
      };
      expect(edgeLength(edge)).toEqual(100);
      expect(edgePosition(edge, 50)).toEqual({ x: x / 2, y: y / 2, angle });
    }
  });

  it('shrinks corner radii on short segments and handles consecutive curves', () => {
    const edge = {
      ...bend,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 10 },
      ],
    };
    expect(edgePath(edge)).toEqual('M 0 0 L 5 0 Q 10 0 10 5 Q 10 10 15 10 L 20 10');
    const midpoint = edgePosition(edge, edgeLength(edge) / 2);
    expect(midpoint.x).toBeCloseTo(10);
    expect(midpoint.y).toBeCloseTo(5);
    expect(midpoint.angle).toBeCloseTo(90);
  });

  it('rejects invalid geometry instead of producing invisible tracks', () => {
    expect(() => edgeLength({ ...bend, points: [] })).toThrow();
    expect(() =>
      edgeLength({
        ...bend,
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
      }),
    ).toThrow();
    expect(() =>
      edgeLength({
        ...bend,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      }),
    ).toThrow();
    expect(() =>
      edgeLength({
        ...bend,
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 5, y: 0 },
        ],
      }),
    ).toThrow();
    expect(() => edgePath({ ...bend, entryDirection: { x: -1, y: 0 } })).toThrow('entry direction');
    expect(() => edgePath({ ...bend, entryDirection: { x: 1, y: 1 } })).toThrow('entry direction');
    expect(() => edgePosition(bend, Number.NaN)).toThrow();
  });
});
