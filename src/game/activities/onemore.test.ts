import { describe, it, expect } from 'vitest';
import type { Rng } from '../types';
import { onemore, onemoreParams } from './onemore';

function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('onemoreParams (§5.7 level table)', () => {
  it('maps levels to {max, deltas, choiceCount}', () => {
    expect(onemoreParams(1)).toEqual({ max: 5, deltas: [1], choiceCount: 3 });
    expect(onemoreParams(2)).toEqual({ max: 5, deltas: [1], choiceCount: 3 });
    expect(onemoreParams(3)).toEqual({
      max: 10,
      deltas: [1, -1],
      choiceCount: 4,
    });
    expect(onemoreParams(4)).toEqual({
      max: 10,
      deltas: [1, -1],
      choiceCount: 4,
    });
    expect(onemoreParams(5)).toEqual({
      max: 20,
      deltas: [1, -1],
      choiceCount: 4,
    });
  });
  it('clamps levels at/above 6 to the top band', () => {
    expect(onemoreParams(6)).toEqual({
      max: 20,
      deltas: [1, -1],
      choiceCount: 4,
    });
    expect(onemoreParams(99)).toEqual({
      max: 20,
      deltas: [1, -1],
      choiceCount: 4,
    });
  });
  it('clamps levels below 1 to L1', () => {
    expect(onemoreParams(0)).toEqual({ max: 5, deltas: [1], choiceCount: 3 });
  });
});

describe('onemore.generate', () => {
  it('derives base, delta, and shuffled choices from rng (pinned, L1 one-more)', () => {
    // L1 -> max5, deltas[1], 3 choices.
    // draw 0 -> delta index 0 -> delta +1; base drawn in [1..max-1]=[1..4]:
    //   draw 0 -> base 1; answer = base+delta = 2.
    // buildChoices(2,3,5): 0.0->1, 0.99->5 => {2,1,5}; shuffle 0,0 => [1,5,2].
    const round = onemore.generate(1, stubRng([0, 0, 0.0, 0.99, 0, 0]));
    expect(round.kind).toBe('onemore');
    expect(round.delta).toBe(1);
    expect(round.base).toBe(1);
    expect(round.choices).toEqual([1, 5, 2]);
  });

  it('derives base, delta, and choices from rng (pinned, L3 one-less)', () => {
    // L3 -> max10, deltas[1,-1], 4 choices.
    // draw 0.99 -> delta index 1 -> delta -1; base drawn in [2..max]=[2..10]:
    //   base = 2 + floor(rng*(max-1)) ; draw 0 -> base 2; answer = base-1 = 1.
    // buildChoices(1,4,10): distractors 0.5->6, 0.2->3, 0.8->9 => [1,6,3,9];
    //   Fisher-Yates with rng 0 swaps arr[i]<->arr[0] for i=3,2,1:
    //   [1,6,3,9]->[9,6,3,1]->[3,6,9,1]->[6,3,9,1].
    const round = onemore.generate(
      3,
      stubRng([0.99, 0, 0.5, 0.2, 0.8, 0, 0, 0]),
    );
    expect(round.kind).toBe('onemore');
    expect(round.delta).toBe(-1);
    expect(round.base).toBe(2);
    expect(round.choices).toEqual([6, 3, 9, 1]);
  });

  it('upholds invariants under fuzzing across levels', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const { max, deltas, choiceCount } = onemoreParams(level);
      for (let i = 0; i < 500; i += 1) {
        const r = onemore.generate(level, Math.random);
        expect(r.kind).toBe('onemore');
        // delta drawn from this level's set
        expect(deltas).toContain(r.delta);
        // answer in range
        const answer = r.base + r.delta;
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(answer).toBeLessThanOrEqual(max);
        // choices contract
        expect(r.choices).toHaveLength(choiceCount);
        expect(r.choices).toContain(answer);
        expect(new Set(r.choices).size).toBe(r.choices.length);
        for (const c of r.choices) {
          expect(c).toBeGreaterThanOrEqual(1);
          expect(c).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('ignores the pool argument (number-based generator)', () => {
    // Passing a pool must not throw or change the contract.
    const r = onemore.generate(3, Math.random, []);
    expect(r.kind).toBe('onemore');
    const answer = r.base + r.delta;
    expect(r.choices).toContain(answer);
  });
});

describe('onemore.evaluate', () => {
  // L1 one-more: base 1, delta +1, answer 2.
  const round = onemore.generate(1, stubRng([0, 0, 0.0, 0.99, 0, 0]));
  it('correct tile (base+delta) is correct and completes the round', () => {
    expect(onemore.evaluate(round, { kind: 'tile', value: 2 })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });
  it('the base itself is wrong (not base+delta)', () => {
    expect(onemore.evaluate(round, { kind: 'tile', value: 1 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
  it('a wrong tile is incorrect and does not complete', () => {
    expect(onemore.evaluate(round, { kind: 'tile', value: 5 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
  it('non-tile payloads are never correct', () => {
    expect(
      onemore.evaluate(round, { kind: 'pair', leftId: 'a', rightId: 'b' }),
    ).toEqual({ correct: false, roundComplete: false });
  });
});

describe('onemore.prompt', () => {
  it('asks "one more" when delta is +1', () => {
    // base 1, delta +1
    const round = onemore.generate(1, stubRng([0, 0, 0.0, 0.99, 0, 0]));
    expect(onemore.prompt(round)).toEqual({
      speech: 'Here are one. What is one more?',
      aria: 'Here are one. What is one more?',
    });
  });
  it('asks "one less" when delta is -1', () => {
    // L3 one-less: base 2, delta -1
    const round = onemore.generate(
      3,
      stubRng([0.99, 0, 0.5, 0.2, 0.8, 0, 0, 0]),
    );
    expect(onemore.prompt(round)).toEqual({
      speech: 'Here are two. What is one less?',
      aria: 'Here are two. What is one less?',
    });
  });
});
