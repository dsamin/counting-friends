import { describe, it, expect } from 'vitest';
import type { Rng } from '../types';
import { buildChoices } from './choices';

/** Array-backed deterministic RNG (cycles), matching the project idiom. */
function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('buildChoices', () => {
  it('returns a pinned shuffled set for a crafted rng (draw: distractors then Fisher-Yates)', () => {
    // set={3}; draw 0.0 -> 1, draw 0.9 -> 5  => insertion [3,1,5]
    // shuffle i=2 j=floor(0.0*3)=0 -> [5,1,3]; i=1 j=floor(0.0*2)=0 -> [1,5,3]
    expect(buildChoices(3, 3, 5, stubRng([0.0, 0.9, 0.0, 0.0]))).toEqual([
      1, 5, 3,
    ]);
  });

  it('always includes the answer even if rng never draws it', () => {
    // answer 2; distractor draws all map to 1, then 0.99 -> 5
    const out = buildChoices(2, 3, 5, stubRng([0, 0, 0, 0.99, 0, 0]));
    expect(out).toContain(2);
    expect(out).toHaveLength(3);
  });

  it('upholds invariants under fuzzing (length, unique, in-range, includes answer)', () => {
    for (let i = 0; i < 500; i += 1) {
      const max = 5 + Math.floor(Math.random() * 16); // 5..20
      const choiceCount = 3 + Math.floor(Math.random() * 3); // 3..5
      const answer = 1 + Math.floor(Math.random() * max);
      const out = buildChoices(answer, choiceCount, max, Math.random);
      expect(out).toHaveLength(choiceCount);
      expect(new Set(out).size).toBe(out.length);
      expect(out).toContain(answer);
      for (const c of out) {
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(max);
      }
    }
  });

  it('does not always place the answer at the same index (shuffled, not sorted)', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 60; seed += 1) {
      const out = buildChoices(2, 4, 10, Math.random);
      positions.add(out.indexOf(2));
    }
    // A sorted/un-shuffled builder would pin the answer to one index.
    expect(positions.size).toBeGreaterThan(1);
  });
});
