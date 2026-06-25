import { describe, it, expect } from 'vitest';
import type { Rng } from '../types';
import { order, orderParams } from './order';

function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('orderParams (§5.6 / §6.3 level table)', () => {
  it('maps levels to {mode, count, max, choiceCount}', () => {
    expect(orderParams(1)).toEqual({ mode: 'next', count: 3, max: 10, choiceCount: 3 });
    expect(orderParams(2)).toEqual({ mode: 'next', count: 3, max: 10, choiceCount: 3 });
    expect(orderParams(3)).toEqual({ mode: 'build', count: 3, max: 10, choiceCount: 3 });
    expect(orderParams(4)).toEqual({ mode: 'build', count: 3, max: 10, choiceCount: 3 });
    expect(orderParams(5)).toEqual({ mode: 'build', count: 4, max: 20, choiceCount: 4 });
  });
  it('clamps levels at/above 6 to the top band', () => {
    expect(orderParams(6)).toEqual({ mode: 'build', count: 4, max: 20, choiceCount: 4 });
    expect(orderParams(99)).toEqual({ mode: 'build', count: 4, max: 20, choiceCount: 4 });
  });
  it('clamps levels below 1 to L1', () => {
    expect(orderParams(0)).toEqual({ mode: 'next', count: 3, max: 10, choiceCount: 3 });
  });
});

describe('order.generate — next mode (L1-2)', () => {
  it('builds a consecutive run and answer = next (pinned)', () => {
    // L1 -> next, count 3, max 10. start ∈ [1, max-count] = [1,7].
    // start = 1 + floor(0.5 * (10-3)) = 1 + floor(3.5) = 1+3 = 4 ; numbers=[4,5,6], answer=[7]
    const round = order.generate(1, stubRng([0.5]));
    expect(round.kind).toBe('order');
    expect(round.mode).toBe('next');
    expect(round.numbers).toEqual([4, 5, 6]);
    expect(round.answer).toEqual([7]);
  });

  it('picks the lowest start with rng 0', () => {
    // start = 1 + floor(0 * 7) = 1 ; numbers=[1,2,3], answer=[4]
    const round = order.generate(2, stubRng([0]));
    expect(round.numbers).toEqual([1, 2, 3]);
    expect(round.answer).toEqual([4]);
  });

  it('keeps the run within [1..max] at the high end (answer fits)', () => {
    // answer must be <= max, so start range is [1, max-count].
    // start = 1 + floor(0.999 * (10-3)) = 1 + 6 = 7 ; numbers=[7,8,9], answer=[10]
    const round = order.generate(1, stubRng([0.999]));
    expect(round.numbers).toEqual([7, 8, 9]);
    expect(round.answer).toEqual([10]);
    expect(round.answer[0]).toBeLessThanOrEqual(10);
  });
});

describe('order.generate — build mode (L3+)', () => {
  it('picks distinct values, shows them shuffled, answer = ascending sort (pinned)', () => {
    // L3 -> build, count 3, max 10. Draw distinct values: 0->1, 0.5->6, 0.9->10 => picked {1,6,10}
    // presentation shuffle (Fisher-Yates over [1,6,10], i=2: j=floor(0*3)=0 swap-> [10,6,1]; i=1: j=floor(0*2)=0 swap-> [6,10,1])
    const round = order.generate(3, stubRng([0, 0.5, 0.9, 0, 0]));
    expect(round.kind).toBe('order');
    expect(round.mode).toBe('build');
    expect(round.answer).toEqual([1, 6, 10]);
    expect([...round.numbers].sort((a, b) => a - b)).toEqual([1, 6, 10]);
    expect(new Set(round.numbers).size).toBe(3);
  });

  it('answer is strictly ascending and equals sorted(numbers)', () => {
    const round = order.generate(5, stubRng([0, 0.25, 0.5, 0.75, 0, 0, 0]));
    expect(round.answer).toEqual([...round.answer].slice().sort((a, b) => a - b));
    expect(round.answer).toEqual([...round.numbers].sort((a, b) => a - b));
    for (let i = 1; i < round.answer.length; i += 1) {
      expect(round.answer[i]).toBeGreaterThan(round.answer[i - 1]);
    }
  });
});

describe('order.generate — invariants under fuzzing', () => {
  it('next mode: consecutive ascending run, answer is next, all in range', () => {
    for (const level of [1, 2]) {
      const { count, max } = orderParams(level);
      for (let i = 0; i < 500; i += 1) {
        const r = order.generate(level, Math.random);
        expect(r.kind).toBe('order');
        expect(r.mode).toBe('next');
        expect(r.numbers).toHaveLength(count);
        // consecutive ascending
        for (let k = 1; k < r.numbers.length; k += 1) {
          expect(r.numbers[k]).toBe(r.numbers[k - 1] + 1);
        }
        expect(r.answer).toHaveLength(1);
        expect(r.answer[0]).toBe(r.numbers[r.numbers.length - 1] + 1);
        // everything in [1..max]
        for (const n of [...r.numbers, ...r.answer]) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('build mode: distinct values, shuffled presentation, ascending answer === sorted(numbers)', () => {
    for (const level of [3, 4, 5, 6]) {
      const { count, max } = orderParams(level);
      for (let i = 0; i < 500; i += 1) {
        const r = order.generate(level, Math.random);
        expect(r.kind).toBe('order');
        expect(r.mode).toBe('build');
        expect(r.numbers).toHaveLength(count);
        expect(r.answer).toHaveLength(count);
        expect(new Set(r.numbers).size).toBe(count); // distinct
        // strictly ascending answer
        for (let k = 1; k < r.answer.length; k += 1) {
          expect(r.answer[k]).toBeGreaterThan(r.answer[k - 1]);
        }
        // answer === sorted(numbers)
        expect(r.answer).toEqual([...r.numbers].sort((a, b) => a - b));
        for (const n of [...r.numbers, ...r.answer]) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(max);
        }
      }
    }
  });
});

describe('order.evaluate — next mode', () => {
  const round = order.generate(1, stubRng([0.5])); // numbers [4,5,6], answer [7]

  it('correct tile completes the round', () => {
    expect(order.evaluate(round, { kind: 'tile', value: 7 })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });

  it('wrong tile is incorrect and does not complete', () => {
    expect(order.evaluate(round, { kind: 'tile', value: 6 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });

  it('a sequence payload (wrong type for next) is incorrect and incomplete', () => {
    expect(order.evaluate(round, { kind: 'sequence', values: [7] })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
});

describe('order.evaluate — build mode', () => {
  // answer ascending [1,6,10]
  const round = order.generate(3, stubRng([0, 0.5, 0.9, 0, 0]));

  it('empty values is a vacuous valid prefix, not complete', () => {
    expect(order.evaluate(round, { kind: 'sequence', values: [] })).toEqual({
      correct: true,
      roundComplete: false,
    });
  });

  it('a correct partial prefix is correct but not complete', () => {
    expect(order.evaluate(round, { kind: 'sequence', values: [1] })).toEqual({
      correct: true,
      roundComplete: false,
    });
    expect(order.evaluate(round, { kind: 'sequence', values: [1, 6] })).toEqual({
      correct: true,
      roundComplete: false,
    });
  });

  it('the full correct sequence is correct and complete', () => {
    expect(order.evaluate(round, { kind: 'sequence', values: [1, 6, 10] })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });

  it('a wrong prefix is incorrect and not complete', () => {
    expect(order.evaluate(round, { kind: 'sequence', values: [6] })).toEqual({
      correct: false,
      roundComplete: false,
    });
    expect(order.evaluate(round, { kind: 'sequence', values: [1, 10] })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });

  it('a full but wrong-order sequence is incorrect (and not complete)', () => {
    expect(order.evaluate(round, { kind: 'sequence', values: [6, 1, 10] })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });

  it('a tile payload (wrong type for build) is incorrect and incomplete', () => {
    expect(order.evaluate(round, { kind: 'tile', value: 1 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
});

describe('order.prompt', () => {
  it('next mode asks what comes next', () => {
    const round = order.generate(1, stubRng([0.5]));
    expect(order.prompt(round)).toEqual({
      speech: 'What comes next?',
      aria: 'What comes next?',
    });
  });

  it('build mode asks to put the numbers in order', () => {
    const round = order.generate(3, stubRng([0, 0.5, 0.9, 0, 0]));
    expect(order.prompt(round)).toEqual({
      speech: 'Put the numbers in order!',
      aria: 'Put the numbers in order!',
    });
  });
});
