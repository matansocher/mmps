import { describe, expect, it } from 'vitest';
import { buildDefaultLineup, DEFAULT_FORMATION, FORMATION_IDS, FORMATIONS, getFormation, type LineupCandidate, OUT_OF_POSITION_GK, OUT_OF_POSITION_RELATED, OUT_OF_POSITION_UNRELATED, outOfPositionPenalty } from './index';

describe('FORMATIONS', () => {
  it('every formation has exactly 11 slots with a goalkeeper first', () => {
    for (const id of FORMATION_IDS) {
      const f = FORMATIONS[id];
      expect(f.slots).toHaveLength(11);
      expect(f.slots[0].role).toEqual('GK');
    }
  });

  it('all slot coordinates are within the normalised pitch', () => {
    for (const id of FORMATION_IDS) {
      for (const slot of FORMATIONS[id].slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x).toBeLessThanOrEqual(1);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('getFormation falls back to the default for an unknown id', () => {
    expect(getFormation('not-a-formation').id).toEqual(DEFAULT_FORMATION);
    expect(getFormation('4-4-2').id).toEqual('4-4-2');
  });
});

describe('outOfPositionPenalty()', () => {
  it('is zero when the player plays the slot naturally', () => {
    expect(outOfPositionPenalty('ST', ['ST', 'CF'])).toEqual(0);
    expect(outOfPositionPenalty('CB', ['CB'])).toEqual(0);
  });

  it('is a small penalty for a related family (e.g. CB played at FB)', () => {
    expect(outOfPositionPenalty('LB', ['CB'])).toEqual(OUT_OF_POSITION_RELATED);
    expect(outOfPositionPenalty('CM', ['CDM'])).toEqual(OUT_OF_POSITION_RELATED);
  });

  it('is a larger penalty for an unrelated family (e.g. ST played at CB)', () => {
    expect(outOfPositionPenalty('CB', ['ST'])).toEqual(OUT_OF_POSITION_UNRELATED);
  });

  it('heavily penalises an outfield player forced into goal', () => {
    expect(outOfPositionPenalty('GK', ['ST'])).toEqual(OUT_OF_POSITION_GK);
    expect(outOfPositionPenalty('GK', ['CB'])).toEqual(OUT_OF_POSITION_GK);
  });

  it('picks the best (least negative) penalty across a player’s positions', () => {
    // A player listed as CB/ST slotted at LB: CB→LB is related (−2), ST→LB unrelated (−5) → take −2.
    expect(outOfPositionPenalty('LB', ['ST', 'CB'])).toEqual(OUT_OF_POSITION_RELATED);
  });
});

describe('buildDefaultLineup()', () => {
  const roleOf = (slots: ReturnType<typeof getFormation>['slots'], ids: number[], id: number) => slots[ids.indexOf(id)]?.role;

  it('assigns each player to a naturally-fitting slot (no RB defaulted to ST)', () => {
    const slots = getFormation('4-4-2').slots;
    // A squad where the highest-overall outfielders are defenders/mids and there
    // are two genuine strikers who are slightly lower rated.
    const squad: LineupCandidate[] = [
      { id: 1, positions: ['GK'], overall: 88 },
      { id: 2, positions: ['RB'], overall: 84 }, // Carvajal-like: high RB
      { id: 3, positions: ['LB'], overall: 83 },
      { id: 4, positions: ['CB'], overall: 85 },
      { id: 5, positions: ['CB'], overall: 83 },
      { id: 6, positions: ['CM'], overall: 89 },
      { id: 7, positions: ['CM'], overall: 88 },
      { id: 8, positions: ['LM', 'LW'], overall: 90 },
      { id: 9, positions: ['RM', 'RW'], overall: 86 },
      { id: 10, positions: ['ST'], overall: 82 }, // genuine ST, lower rated
      { id: 11, positions: ['ST', 'CF'], overall: 81 }, // genuine ST, lowest
    ];
    const xi = buildDefaultLineup(slots, squad);
    // Every slot must be filled by a player whose natural fit is 0 penalty.
    for (let i = 0; i < slots.length; i += 1) {
      const cand = squad.find((c) => c.id === xi[i])!;
      expect(outOfPositionPenalty(slots[i].role, cand.positions)).toEqual(0);
    }
    // Specifically, the RB/LB are in the back line, the STs take the ST slots.
    expect(['LB', 'RB']).toContain(roleOf(slots, xi, 2));
    expect(roleOf(slots, xi, 10)).toEqual('ST');
    expect(roleOf(slots, xi, 11)).toEqual('ST');
    expect(roleOf(slots, xi, 1)).toEqual('GK');
  });

  it('returns exactly 11 unique players in slot order', () => {
    const slots = getFormation('4-3-3').slots;
    const squad: LineupCandidate[] = Array.from({ length: 14 }, (_, i) => ({ id: i + 1, positions: [['GK', 'CB', 'LB', 'RB', 'CM', 'CDM', 'CAM', 'LW', 'RW', 'ST'][i % 10]], overall: 70 + i }));
    const xi = buildDefaultLineup(slots, squad);
    expect(xi).toHaveLength(11);
    expect(new Set(xi).size).toEqual(11);
  });

  it('is deterministic for identical input', () => {
    const slots = getFormation('4-2-3-1').slots;
    const squad: LineupCandidate[] = Array.from({ length: 11 }, (_, i) => ({ id: i + 1, positions: [slots[i].role], overall: 80 }));
    expect(buildDefaultLineup(slots, squad)).toEqual(buildDefaultLineup(slots, squad));
  });
});
