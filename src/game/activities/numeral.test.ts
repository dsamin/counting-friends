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
    expect(numeralParams(3)).toEqual({ max: 10, choiceCount: 4, lookAlike: false });
    expect(numeralParams(4)).toEqual({ max: 10, choiceCount: 4, lookAlike: false });
    expect(numeralParams(5)).toEqual({ max: 20, choiceCount: 5, lookAlike: false });
  });
  it('clamps levels at/above 6 to the top band', () => {
    expect(numeralParams(6)).toEqual({ max: 20, choiceCount: 5, lookAlike: false });
    expect(numeralParams(99)).toEqual({ max: 20, choiceCount: 5, lookAlike: false });
  });
  it('clamps levels below 1 to L1', () => {
    expect(numeralParams(0)).toEqual({ max: 5, choiceCount: 3, lookAlike: false });
  });
  it('keeps lookAlike false at every level (look-alike is fast-follow)', () => {
    for (const level of [1, 2, 3, 4, 5, 6, 10]) {
      expect(numeralParams(level).lookAlike).toBe(false);
    }
  });
});

describe('numeral.generate', () => {
  it('derives target and shuffled choices from rng (pinned)', () => {
    // L1 -> max5/3choices. draw 0.5 -> target 1+floor(0.5*5)=3;
    // buildChoices(3,3,5): 0.0->1, 0.99->5 => set {3,1,5}; shuffle 0,0 => [1,5,3]
    const round = numeral.generate(1, stubRng([0.5, 0.0, 0.99, 0, 0]));
    expect(round.kind).toBe('numeral');
    expect(round.target).toBe(3);
    expect(round.choices).toEqual([1, 5, 3]);
    expect(round.lookAlike).toBe(false);
  });

  it('derives a second pinned example', () => {
    // L2 -> max5/4choices. draw 0 -> target 1;
    // buildChoices(1,4,5): 0.99->5, 0.5->3, 0.2->2 => {1,5,3,2}; shuffle 0,0,0 => [2,5,3,1]
    const round = numeral.generate(2, stubRng([0, 0.99, 0.5, 0.2, 0, 0, 0]));
    expect(round.target).toBe(1);
    expect(round.choices).toContain(1);
    expect(round.choices).toHaveLength(4);
    expect(round.lookAlike).toBe(false);
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
        expect(r.lookAlike).toBe(false);
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
