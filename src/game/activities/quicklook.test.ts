import { describe, it, expect } from 'vitest';
import type { Rng } from '../types';
import { quicklook, quicklookParams } from './quicklook';

function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('quicklookParams (§6.3 / §5.4 level table)', () => {
  it('maps levels to {max, choiceCount, arrangement, revealMs}', () => {
    expect(quicklookParams(1)).toEqual({
      max: 4,
      choiceCount: 4,
      arrangement: 'dice',
      revealMs: 1000,
    });
    expect(quicklookParams(2)).toEqual({
      max: 4,
      choiceCount: 4,
      arrangement: 'dice',
      revealMs: 900,
    });
    expect(quicklookParams(3)).toEqual({
      max: 5,
      choiceCount: 4,
      arrangement: 'dice',
      revealMs: 1100,
    });
    expect(quicklookParams(4)).toEqual({
      max: 5,
      choiceCount: 4,
      arrangement: 'random',
      revealMs: 1000,
    });
    expect(quicklookParams(5)).toEqual({
      max: 8,
      choiceCount: 4,
      arrangement: 'random',
      revealMs: 1500,
    });
  });
  it('clamps levels at/above 6 to the top band', () => {
    expect(quicklookParams(6)).toEqual({
      max: 10,
      choiceCount: 4,
      arrangement: 'random',
      revealMs: 1500,
    });
    expect(quicklookParams(99)).toEqual({
      max: 10,
      choiceCount: 4,
      arrangement: 'random',
      revealMs: 1500,
    });
  });
  it('clamps levels below 1 to L1', () => {
    expect(quicklookParams(0)).toEqual({
      max: 4,
      choiceCount: 4,
      arrangement: 'dice',
      revealMs: 1000,
    });
  });
  it('choiceCount === Math.min(4, max) at every level', () => {
    for (const level of [1, 2, 3, 4, 5, 6, 10]) {
      const p = quicklookParams(level);
      expect(p.choiceCount).toBe(Math.min(4, p.max));
    }
  });
  it('HARD RULE: revealMs < 1000 implies max <= 5 at every level', () => {
    for (const level of [1, 2, 3, 4, 5, 6, 10]) {
      const p = quicklookParams(level);
      if (p.revealMs < 1000) expect(p.max).toBeLessThanOrEqual(5);
    }
  });
});

describe('quicklook.generate', () => {
  it('derives count and shuffled choices from rng (pinned)', () => {
    // L1 -> max4/4choices/dice/1000. draw 0.5 -> count 1+floor(0.5*4)=3;
    // buildChoices(3,4,4): 0.99->4, 0.0->1, 0.4->2 => {3,4,1,2}; shuffle 0,0,0
    const round = quicklook.generate(1, stubRng([0.5, 0.99, 0.0, 0.4, 0, 0, 0]));
    expect(round.kind).toBe('quicklook');
    expect(round.count).toBe(3);
    expect(round.choices).toHaveLength(4);
    expect(round.choices).toContain(3);
    expect(round.revealMs).toBe(1000);
    expect(round.arrangement).toBe('dice');
  });

  it('derives a second pinned example (L4 random)', () => {
    // L4 -> max5/4choices/random/1000. draw 0 -> count 1;
    const round = quicklook.generate(4, stubRng([0, 0.99, 0.5, 0.2, 0, 0, 0]));
    expect(round.count).toBe(1);
    expect(round.choices).toContain(1);
    expect(round.choices).toHaveLength(4);
    expect(round.revealMs).toBe(1000);
    expect(round.arrangement).toBe('random');
  });

  it('upholds invariants under fuzzing across levels', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const { max, choiceCount, arrangement, revealMs } = quicklookParams(level);
      for (let i = 0; i < 500; i += 1) {
        const r = quicklook.generate(level, Math.random);
        expect(r.kind).toBe('quicklook');
        expect(r.count).toBeGreaterThanOrEqual(1);
        expect(r.count).toBeLessThanOrEqual(max);
        expect(r.choices).toHaveLength(choiceCount);
        expect(r.choices).toContain(r.count);
        expect(new Set(r.choices).size).toBe(r.choices.length);
        for (const c of r.choices) {
          expect(c).toBeGreaterThanOrEqual(1);
          expect(c).toBeLessThanOrEqual(max);
        }
        // revealMs invariants (§5.9)
        expect(r.revealMs).toBeGreaterThan(0);
        expect(r.revealMs).toBe(revealMs);
        if (r.revealMs < 1000) expect(r.count).toBeLessThanOrEqual(5);
        expect(['dice', 'random']).toContain(r.arrangement);
        expect(r.arrangement).toBe(arrangement);
      }
    }
  });
});

describe('quicklook.evaluate', () => {
  const round = quicklook.generate(1, stubRng([0.5, 0.99, 0.0, 0.4, 0, 0, 0])); // count 3
  it('correct tile is correct and completes the round', () => {
    expect(quicklook.evaluate(round, { kind: 'tile', value: 3 })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });
  it('wrong tile is incorrect and does not complete', () => {
    expect(quicklook.evaluate(round, { kind: 'tile', value: 1 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
  it('non-tile payloads are never correct', () => {
    expect(
      quicklook.evaluate(round, { kind: 'pair', leftId: 'a', rightId: 'b' }),
    ).toEqual({ correct: false, roundComplete: false });
  });
});

describe('quicklook.prompt', () => {
  it('asks "Quick! How many did you see?"', () => {
    const round = quicklook.generate(1, stubRng([0.5, 0.99, 0.0, 0.4, 0, 0, 0]));
    expect(quicklook.prompt(round)).toEqual({
      speech: 'Quick! How many did you see?',
      aria: 'Quick! How many did you see?',
    });
  });
});
