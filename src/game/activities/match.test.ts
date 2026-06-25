import { describe, it, expect } from 'vitest';
import type { Rng } from '../types';
import type { MatchRound } from './types';
import { match, matchParams } from './match';

function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('matchParams (§6.3 level table, pairCount capped at 3)', () => {
  it('maps levels to {pairCount, max}', () => {
    expect(matchParams(1)).toEqual({ pairCount: 2, max: 5 });
    expect(matchParams(2)).toEqual({ pairCount: 2, max: 5 });
    expect(matchParams(3)).toEqual({ pairCount: 3, max: 10 });
    expect(matchParams(4)).toEqual({ pairCount: 3, max: 10 });
    expect(matchParams(5)).toEqual({ pairCount: 3, max: 20 });
  });
  it('clamps levels at/above 6 to the top band', () => {
    expect(matchParams(6)).toEqual({ pairCount: 3, max: 20 });
    expect(matchParams(99)).toEqual({ pairCount: 3, max: 20 });
  });
  it('clamps levels below 1 to L1', () => {
    expect(matchParams(0)).toEqual({ pairCount: 2, max: 5 });
  });
  it('never exceeds pairCount 3 (portrait-safe) at any level', () => {
    for (const level of [1, 2, 3, 4, 5, 6, 10]) {
      expect(matchParams(level).pairCount).toBeLessThanOrEqual(3);
    }
  });
});

/** Helper: assert a generated round satisfies the §5.9 match invariants. */
function assertMatchInvariants(r: MatchRound, pairCount: number, max: number) {
  expect(r.kind).toBe('match');
  expect(r.variant).toBe('groupNum');
  // |left| === |right| === pairCount
  expect(r.left).toHaveLength(pairCount);
  expect(r.right).toHaveLength(pairCount);
  // kinds
  for (const l of r.left) expect(l.kind).toBe('group');
  for (const rr of r.right) expect(rr.kind).toBe('numeral');
  // values distinct within each column, all in [1..max]
  const leftVals = r.left.map((x) => x.value);
  const rightVals = r.right.map((x) => x.value);
  expect(new Set(leftVals).size).toBe(leftVals.length);
  expect(new Set(rightVals).size).toBe(rightVals.length);
  for (const v of [...leftVals, ...rightVals]) {
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(max);
  }
  // solution: every leftId maps to a right id present in `right`; bijection
  const rightIds = new Set(r.right.map((x) => x.id));
  const leftIds = new Set(r.left.map((x) => x.id));
  const solEntries = Object.entries(r.solution);
  expect(solEntries).toHaveLength(pairCount);
  const usedRightIds = new Set<string>();
  for (const [leftId, rightId] of solEntries) {
    expect(leftIds.has(leftId)).toBe(true);
    expect(rightIds.has(rightId)).toBe(true);
    usedRightIds.add(rightId);
    // same value on both ends
    const lItem = r.left.find((x) => x.id === leftId)!;
    const rItem = r.right.find((x) => x.id === rightId)!;
    expect(lItem.value).toBe(rItem.value);
  }
  expect(usedRightIds.size).toBe(pairCount); // bijection: each right id used once
}

describe('match.generate', () => {
  it('builds distinct-quantity pairs with independent shuffles (pinned)', () => {
    // L1 -> pairCount2/max5. distinct draws: 0.5->3, 0.5->3(dup), 0->1 => quantities [3,1]
    // left  = [L0(v3), L1(v1)]; right = [R0(v3), R1(v1)]; solution {L0:R0, L1:R1}
    // left FY shuffle (len2): i=1, j=floor(0*2)=0 -> swap -> [L1(1), L0(3)]
    // right FY shuffle (len2): i=1, j=floor(0.99*2)=1 -> no swap -> [R0(3), R1(1)]
    const r = match.generate(1, stubRng([0.5, 0.5, 0, 0, 0.99]));
    expect(r.left.map((x) => x.value)).toEqual([1, 3]);
    expect(r.right.map((x) => x.value)).toEqual([3, 1]);
    expect(r.solution).toEqual({ L0: 'R0', L1: 'R1' });
    assertMatchInvariants(r, 2, 5);
  });

  it('builds a 3-pair round (pinned, L3)', () => {
    // L3 -> pairCount3/max10. distinct draws: 0->1, 0.4->5, 0.8->9 => [1,5,9]
    const r = match.generate(3, stubRng([0, 0.4, 0.8, 0, 0, 0, 0, 0, 0]));
    expect(new Set(r.left.map((x) => x.value))).toEqual(new Set([1, 5, 9]));
    assertMatchInvariants(r, 3, 10);
  });

  it('upholds invariants under fuzzing across levels', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const { pairCount, max } = matchParams(level);
      for (let i = 0; i < 500; i += 1) {
        const r = match.generate(level, Math.random);
        assertMatchInvariants(r, pairCount, max);
        expect(pairCount).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe('match.evaluate', () => {
  const r = match.generate(1, stubRng([0.5, 0.5, 0, 0, 0.99])); // solution {L0:R0, L1:R1}
  it('correct pair is correct but NEVER completes (engine owns completion)', () => {
    expect(match.evaluate(r, { kind: 'pair', leftId: 'L0', rightId: 'R0' })).toEqual({
      correct: true,
      roundComplete: false,
    });
  });
  it('a correct pair that finishes all links still returns roundComplete false', () => {
    expect(match.evaluate(r, { kind: 'pair', leftId: 'L1', rightId: 'R1' })).toEqual({
      correct: true,
      roundComplete: false,
    });
  });
  it('wrong pair is incorrect and does not complete', () => {
    expect(match.evaluate(r, { kind: 'pair', leftId: 'L0', rightId: 'R1' })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
  it('non-pair payloads are never correct and never complete', () => {
    expect(match.evaluate(r, { kind: 'tile', value: 3 })).toEqual({
      correct: false,
      roundComplete: false,
    });
    expect(match.evaluate(r, { kind: 'sequence', values: [1, 2] })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
});

describe('match.prompt', () => {
  it('asks "Match each group to its number!"', () => {
    const r = match.generate(1, stubRng([0.5, 0.5, 0, 0, 0.99]));
    expect(match.prompt(r)).toEqual({
      speech: 'Match each group to its number!',
      aria: 'Match each group to its number!',
    });
  });
});
