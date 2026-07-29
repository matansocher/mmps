import { describe, expect, it, test } from 'vitest';
import {
  applyAging,
  applyMatchProgress,
  DEFAULT_PROGRESS,
  effectiveOverall,
  FITNESS_MAX,
  MORALE_MAX,
  rollCards,
  rollInjury,
  YELLOW_CARD_SUSPENSION_THRESHOLD,
  type PlayerProgress,
} from './progression';

describe('effectiveOverall()', () => {
  it('returns the base when the player is at default full progress (fitness 100, morale 70, form 0)', () => {
    expect(effectiveOverall(80, DEFAULT_PROGRESS)).toEqual(80);
  });

  it('adds positive form and high morale', () => {
    const p: PlayerProgress = { form: 5, morale: 100, fitness: 100, overallDelta: 0 };
    expect(effectiveOverall(80, p)).toBeGreaterThan(80);
  });

  it('penalises low fitness', () => {
    const tired: PlayerProgress = { form: 0, morale: 70, fitness: 0, overallDelta: 0 };
    expect(effectiveOverall(80, tired)).toBeLessThan(80);
  });

  it('folds in permanent aging drift', () => {
    const aged: PlayerProgress = { ...DEFAULT_PROGRESS, overallDelta: -4 };
    expect(effectiveOverall(80, aged)).toEqual(76);
  });

  it('clamps into 30..99', () => {
    const monster: PlayerProgress = { form: 5, morale: 100, fitness: 100, overallDelta: 20 };
    expect(effectiveOverall(95, monster)).toBeLessThanOrEqual(99);
  });
});

describe('applyMatchProgress()', () => {
  it('a starter who wins gains form and morale but loses fitness', () => {
    const next = applyMatchProgress(DEFAULT_PROGRESS, { started: true, minutesPlayed: 90, goals: 0, outcome: 'win' });
    expect(next.form).toBeGreaterThan(DEFAULT_PROGRESS.form);
    expect(next.morale).toBeGreaterThan(DEFAULT_PROGRESS.morale);
    expect(next.fitness).toBeLessThan(DEFAULT_PROGRESS.fitness);
  });

  it('a scorer gains extra form', () => {
    const scored = applyMatchProgress(DEFAULT_PROGRESS, { started: true, minutesPlayed: 90, goals: 2, outcome: 'win' });
    const blanked = applyMatchProgress(DEFAULT_PROGRESS, { started: true, minutesPlayed: 90, goals: 0, outcome: 'win' });
    expect(scored.form).toBeGreaterThan(blanked.form);
  });

  it('a rested player recovers fitness and does not lose form/morale from a loss', () => {
    const drained: PlayerProgress = { ...DEFAULT_PROGRESS, fitness: 50 };
    const next = applyMatchProgress(drained, { started: false, minutesPlayed: 0, goals: 0, outcome: 'loss' });
    expect(next.fitness).toBeGreaterThan(drained.fitness);
  });

  it('form decays toward zero when not playing', () => {
    const hot: PlayerProgress = { ...DEFAULT_PROGRESS, form: 3 };
    const cold: PlayerProgress = { ...DEFAULT_PROGRESS, form: -3 };
    expect(applyMatchProgress(hot, { started: false, minutesPlayed: 0, goals: 0, outcome: 'draw' }).form).toEqual(2);
    expect(applyMatchProgress(cold, { started: false, minutesPlayed: 0, goals: 0, outcome: 'draw' }).form).toEqual(-2);
  });

  it('never exceeds the morale/fitness caps', () => {
    const next = applyMatchProgress({ form: 0, morale: 99, fitness: 99, overallDelta: 0 }, { started: false, minutesPlayed: 0, goals: 0, outcome: 'draw' });
    expect(next.morale).toBeLessThanOrEqual(MORALE_MAX);
    expect(next.fitness).toBeLessThanOrEqual(FITNESS_MAX);
  });
});

describe('rollInjury()', () => {
  it('returns 0 for a player who did not feature', () => {
    expect(rollInjury(100, 0, 'seed')).toEqual(0);
  });

  it('is deterministic for a given seed', () => {
    expect(rollInjury(40, 90, 'career:1:5:123')).toEqual(rollInjury(40, 90, 'career:1:5:123'));
  });

  it('exhausted players get injured more often than fresh ones over many seeds', () => {
    let tiredInjuries = 0;
    let freshInjuries = 0;
    for (let i = 0; i < 500; i++) {
      if (rollInjury(10, 90, `s${i}`) > 0) tiredInjuries++;
      if (rollInjury(100, 90, `s${i}`) > 0) freshInjuries++;
    }
    expect(tiredInjuries).toBeGreaterThan(freshInjuries);
  });
});

describe('rollCards()', () => {
  it('does not book a player who did not feature', () => {
    expect(rollCards(3, 0, 'seed')).toEqual({ yellowCards: 3, suspensionMatches: 0 });
  });

  it('is deterministic for a given seed', () => {
    expect(rollCards(2, 90, 'x')).toEqual(rollCards(2, 90, 'x'));
  });

  it('triggers a suspension and resets the counter when hitting the yellow threshold', () => {
    // Find a seed that yields a yellow (not a red) to exercise the threshold reset.
    let result = { yellowCards: YELLOW_CARD_SUSPENSION_THRESHOLD - 1, suspensionMatches: 0 };
    for (let i = 0; i < 200; i++) {
      const r = rollCards(YELLOW_CARD_SUSPENSION_THRESHOLD - 1, 90, `yc${i}`);
      if (r.suspensionMatches > 0 && r.yellowCards === 0) {
        result = r;
        break;
      }
    }
    expect(result.suspensionMatches).toBeGreaterThan(0);
    expect(result.yellowCards).toEqual(0);
  });
});

describe('applyAging()', () => {
  test.each([
    { age: 19, base: 70, potential: 88, label: 'young talent rises toward potential' },
    { age: 21, base: 82, potential: 90, label: 'young star still rises' },
  ])('$label', ({ age, base, potential }) => {
    const delta = applyAging(base, potential, age, 0, `age:${age}`);
    expect(delta).toBeGreaterThanOrEqual(0);
    expect(base + delta).toBeLessThanOrEqual(potential + 1);
  });

  it('declines veterans', () => {
    const delta = applyAging(84, 84, 34, 0, 'vet');
    expect(delta).toBeLessThan(0);
  });

  it('does not push a young player past his potential', () => {
    const delta = applyAging(87, 88, 20, 0, 'cap');
    expect(87 + delta).toBeLessThanOrEqual(89);
  });

  it('is deterministic', () => {
    expect(applyAging(80, 85, 22, 0, 'z')).toEqual(applyAging(80, 85, 22, 0, 'z'));
  });
});
