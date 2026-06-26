import { describe, it, expect } from 'vitest';
import type { Rng } from '../types';
import { numeral, numeralParams } from './numeral';

function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('numeralParams (§6.3 level table)', () => {
  it('maps levels to {max, choiceCount, lookAlike}', () => {
    expect(numeralParams(1)).toEqual({ max: 5, choiceCount: 3, lookAlike: false });
    expect(numeralParams(2)).toEqual({ max: 5, choiceCount: 4, lookAlike: false });
    expect(numeralParams(3)).toEqual({ max: 10, choiceCount: 4, lookAlike: true });
    expect(numeralParams(4)).toEqual({ max: 10, choiceCount: 4, lookAlike: true });
    expect(numeralParams(5)).toEqual({ max: 20, choiceCount: 5, lookAlike: true });
  });
  it('clamps levels at/above 6 to the top band', () => {
    expect(numeralParams(6)).toEqual({ max: 20, choiceCount: 5, lookAlike: true });
    expect(numeralParams(99)).toEqual({ max: 20, choiceCount: 5, lookAlike: true });
  });
  it('clamps levels below 1 to L1', () => {
    expect(numeralParams(0)).toEqual({ max: 5, choiceCount: 3, lookAlike: false });
  });
  it('look-alikes are off for L1-2 and gated on from L3 (§5.2)', () => {
    expect(numeralParams(1).lookAlike).toBe(false);
    expect(numeralParams(2).lookAlike).toBe(false);
    for (const level of [3, 4, 5, 6, 10]) {
      expect(numeralParams(level).lookAlike).toBe(true);
    }
  });
});

describe('numeral.generate', () => {
  it('derives target and shuffled choices from rng (pinned)', () => {
    const round = numeral.generate(1, stubRng([0.5, 0.0, 0.99, 0, 0]));
    expect(round.kind).toBe('numeral');
    expect(round.target).toBe(3);
    expect(round.choices).toEqual([1, 5, 3]);
    expect(round.lookAlike).toBe(false);
  });

  it('a non-look-alike target at L3 is an ordinary round', () => {
    // target = 1 + floor(0*10) = 1 → not in a confusable pair → lookAlike false
    const round = numeral.generate(3, stubRng([0.0, 0.1, 0.2, 0.3, 0.4]));
    expect(round.target).toBe(1);
    expect(round.lookAlike).toBe(false);
  });

  it('at L3+ a 6 target forces the look-alike 9 and flags lookAlike (§5.2)', () => {
    // target = 1 + floor(0.55*10) = 6 → partner 9 forced into the choices
    const round = numeral.generate(3, stubRng([0.55, 0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(round.target).toBe(6);
    expect(round.lookAlike).toBe(true);
    expect(round.choices).toContain(6);
    expect(round.choices).toContain(9);
    expect(round.choices).toHaveLength(4);
  });

  it('at L3+ a 9 target forces the look-alike 6', () => {
    // target = 1 + floor(0.85*10) = 9 → partner 6 forced in
    const round = numeral.generate(3, stubRng([0.85, 0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(round.target).toBe(9);
    expect(round.lookAlike).toBe(true);
    expect(round.choices).toContain(6);
  });

  it('upholds invariants under fuzzing across levels', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const { max, choiceCount } = numeralParams(level);
      for (let i = 0; i < 500; i += 1) {
        const r = numeral.generate(level, Math.random);
        expect(r.kind).toBe('numeral');
        expect(r.target).toBeGreaterThanOrEqual(1);
        expect(r.target).toBeLessThanOrEqual(max);
        expect(r.choices).toHaveLength(choiceCount);
        expect(r.choices).toContain(r.target);
        expect(new Set(r.choices).size).toBe(r.choices.length);
        for (const c of r.choices) {
          expect(c).toBeGreaterThanOrEqual(1);
          expect(c).toBeLessThanOrEqual(max);
        }
        // A look-alike round only happens for a 6/9 target at L3+ and forces the partner in.
        if (r.lookAlike) {
          expect(level).toBeGreaterThanOrEqual(3);
          expect([6, 9]).toContain(r.target);
          expect(r.choices).toContain(r.target === 6 ? 9 : 6);
        }
      }
    }
  });
});

describe('numeral.evaluate', () => {
  const round = numeral.generate(1, stubRng([0.5, 0.0, 0.99, 0, 0])); // target 3
  it('correct tile is correct and completes the round', () => {
    expect(numeral.evaluate(round, { kind: 'tile', value: 3 })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });
  it('wrong tile is incorrect and does not complete', () => {
    expect(numeral.evaluate(round, { kind: 'tile', value: 1 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
  it('non-tile payloads are never correct', () => {
    expect(
      numeral.evaluate(round, { kind: 'pair', leftId: 'a', rightId: 'b' }),
    ).toEqual({ correct: false, roundComplete: false });
  });
});

describe('numeral.prompt', () => {
  it('asks "Find the {word}!"', () => {
    const round = numeral.generate(1, stubRng([0.5, 0.0, 0.99, 0, 0])); // target 3
    expect(numeral.prompt(round)).toEqual({
      speech: 'Find the three!',
      aria: 'Find the three!',
    });
  });
});
