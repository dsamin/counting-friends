import { describe, it, expect } from 'vitest';
import type { Rng } from '../types';
import { compare, compareParams } from './compare';

function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('compareParams (§5.5 / §6.3 level table)', () => {
  it('maps levels to {max, asks, minGap}', () => {
    expect(compareParams(1)).toEqual({ max: 5, asks: ['more'], minGap: 2 });
    expect(compareParams(2)).toEqual({ max: 5, asks: ['more'], minGap: 2 });
    expect(compareParams(3)).toEqual({
      max: 10,
      asks: ['more', 'fewer'],
      minGap: 1,
    });
    expect(compareParams(4)).toEqual({
      max: 10,
      asks: ['more', 'fewer'],
      minGap: 1,
    });
    expect(compareParams(5)).toEqual({
      max: 20,
      asks: ['more', 'fewer'],
      minGap: 1,
    });
  });
  it('clamps levels at/above 6 to the top band', () => {
    expect(compareParams(6)).toEqual({
      max: 20,
      asks: ['more', 'fewer'],
      minGap: 1,
    });
    expect(compareParams(99)).toEqual({
      max: 20,
      asks: ['more', 'fewer'],
      minGap: 1,
    });
  });
  it('clamps levels below 1 to L1', () => {
    expect(compareParams(0)).toEqual({ max: 5, asks: ['more'], minGap: 2 });
  });
});

describe('compare.generate', () => {
  it('derives left, right, ask from rng (pinned, L1)', () => {
    // L1 -> max5, minGap2, asks ['more'].
    // draw 0.0 -> left 1; draw 0.99 -> right 5 (|1-5|=4 >= 2 ok);
    // ask: floor(rng*1)=0 -> 'more'.
    const round = compare.generate(1, stubRng([0.0, 0.99, 0]));
    expect(round).toEqual({ kind: 'compare', left: 1, right: 5, ask: 'more' });
  });

  it('derives left, right, ask from rng (pinned, L3 fewer)', () => {
    // L3 -> max10, minGap1, asks ['more','fewer'].
    // draw 0.5 -> left 6; draw 0.0 -> right 1 (|6-1|=5 >= 1 ok);
    // ask: floor(0.99*2)=1 -> 'fewer'.
    const round = compare.generate(3, stubRng([0.5, 0.0, 0.99]));
    expect(round).toEqual({ kind: 'compare', left: 6, right: 1, ask: 'fewer' });
  });

  it('redraws right until distinct and minGap is met (pinned)', () => {
    // L1 -> max5, minGap2. left 0.0 -> 1.
    // right 0.1 -> 1 (equal, reject); 0.2 -> 2 (gap 1 < 2, reject);
    // 0.99 -> 5 (gap 4 ok). ask 0 -> 'more'.
    const round = compare.generate(1, stubRng([0.0, 0.1, 0.2, 0.99, 0]));
    expect(round).toEqual({ kind: 'compare', left: 1, right: 5, ask: 'more' });
  });

  it('upholds invariants under fuzzing across levels', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const { max, asks, minGap } = compareParams(level);
      for (let i = 0; i < 500; i += 1) {
        const r = compare.generate(level, Math.random);
        expect(r.kind).toBe('compare');
        // never equal
        expect(r.left).not.toBe(r.right);
        // both in range
        expect(r.left).toBeGreaterThanOrEqual(1);
        expect(r.left).toBeLessThanOrEqual(max);
        expect(r.right).toBeGreaterThanOrEqual(1);
        expect(r.right).toBeLessThanOrEqual(max);
        // gap honoured
        expect(Math.abs(r.left - r.right)).toBeGreaterThanOrEqual(minGap);
        // ask drawn from the level's set
        expect(asks).toContain(r.ask);
      }
    }
  });
});

describe('compare.evaluate', () => {
  // left 1, right 5, ask 'more' -> the bigger group (5) is correct.
  const moreRound = compare.generate(1, stubRng([0.0, 0.99, 0]));
  // left 6, right 1, ask 'fewer' -> the smaller group (1) is correct.
  const fewerRound = compare.generate(3, stubRng([0.5, 0.0, 0.99]));

  it('more: tapping the larger group is correct and completes', () => {
    expect(compare.evaluate(moreRound, { kind: 'tile', value: 5 })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });
  it('more: tapping the smaller group is incorrect and does not complete', () => {
    expect(compare.evaluate(moreRound, { kind: 'tile', value: 1 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
  it('fewer: tapping the smaller group is correct and completes', () => {
    expect(compare.evaluate(fewerRound, { kind: 'tile', value: 1 })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });
  it('fewer: tapping the larger group is incorrect and does not complete', () => {
    expect(compare.evaluate(fewerRound, { kind: 'tile', value: 6 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
  it('non-tile payloads are never correct', () => {
    expect(
      compare.evaluate(moreRound, { kind: 'pair', leftId: 'a', rightId: 'b' }),
    ).toEqual({ correct: false, roundComplete: false });
  });
});

describe('compare.prompt', () => {
  it('more -> "Tap the group with more!" (speech === aria)', () => {
    const round = compare.generate(1, stubRng([0.0, 0.99, 0]));
    expect(compare.prompt(round)).toEqual({
      speech: 'Tap the group with more!',
      aria: 'Tap the group with more!',
    });
  });
  it('fewer -> "Tap the group with fewer!" (speech === aria)', () => {
    const round = compare.generate(3, stubRng([0.5, 0.0, 0.99]));
    expect(compare.prompt(round)).toEqual({
      speech: 'Tap the group with fewer!',
      aria: 'Tap the group with fewer!',
    });
  });
});
