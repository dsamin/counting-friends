import { describe, it, expect } from 'vitest';
import type { Rng } from '../types';
import { CHARACTERS } from '../characters';
import { count, countParams } from './count';

function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('countParams (§6.3 level table)', () => {
  it('maps levels to {max, choiceCount}', () => {
    expect(countParams(1)).toEqual({ max: 5, choiceCount: 3 });
    expect(countParams(2)).toEqual({ max: 5, choiceCount: 4 });
    expect(countParams(3)).toEqual({ max: 10, choiceCount: 4 });
    expect(countParams(4)).toEqual({ max: 10, choiceCount: 5 });
    expect(countParams(5)).toEqual({ max: 20, choiceCount: 5 });
  });
  it('clamps levels at/above 6 to the top band', () => {
    expect(countParams(6)).toEqual({ max: 20, choiceCount: 5 });
    expect(countParams(99)).toEqual({ max: 20, choiceCount: 5 });
  });
  it('clamps levels below 1 to L1', () => {
    expect(countParams(0)).toEqual({ max: 5, choiceCount: 3 });
  });
});

describe('count.generate', () => {
  it('derives count, animal, and shuffled choices from rng (pinned)', () => {
    // L1 -> max5/3choices. draw 0.5 -> count 3; draw 0 -> duck;
    // buildChoices(3,3,5): 0.0->1, 0.99->5 => [3,1,5]; shuffle 0,0 => [1,5,3]
    const round = count.generate(1, stubRng([0.5, 0, 0.0, 0.99, 0, 0]));
    expect(round.kind).toBe('count');
    expect(round.count).toBe(3);
    expect(round.animal.key).toBe('duck');
    expect(round.choices).toEqual([1, 5, 3]);
  });

  it('upholds invariants under fuzzing across levels', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const { max, choiceCount } = countParams(level);
      for (let i = 0; i < 200; i += 1) {
        const r = count.generate(level, Math.random);
        expect(r.kind).toBe('count');
        expect(r.count).toBeGreaterThanOrEqual(1);
        expect(r.count).toBeLessThanOrEqual(max);
        expect(r.choices).toHaveLength(choiceCount);
        expect(r.choices).toContain(r.count);
        expect(new Set(r.choices).size).toBe(r.choices.length);
        for (const c of r.choices) {
          expect(c).toBeGreaterThanOrEqual(1);
          expect(c).toBeLessThanOrEqual(max);
        }
        expect(CHARACTERS).toContain(r.animal);
      }
    }
  });
});

describe('count.evaluate', () => {
  const round = count.generate(1, stubRng([0.5, 0, 0.0, 0.99, 0, 0])); // count 3
  it('correct tile is correct and completes the round', () => {
    expect(count.evaluate(round, { kind: 'tile', value: 3 })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });
  it('wrong tile is incorrect and does not complete', () => {
    expect(count.evaluate(round, { kind: 'tile', value: 1 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
  it('non-tile payloads are never correct', () => {
    expect(
      count.evaluate(round, { kind: 'pair', leftId: 'a', rightId: 'b' }),
    ).toEqual({ correct: false, roundComplete: false });
  });
});

describe('count.prompt', () => {
  it('asks "How many {plural}?" (matches v1 promptLine)', () => {
    const round = count.generate(1, stubRng([0.5, 0, 0.0, 0.99, 0, 0]));
    expect(count.prompt(round)).toEqual({
      speech: 'How many ducks?',
      aria: 'How many ducks?',
    });
  });
});
