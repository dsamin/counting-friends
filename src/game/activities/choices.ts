import type { Rng } from '../types';

/**
 * Build a shuffled set of `choiceCount` unique answer tiles in `[1..max]` that
 * always contains `answer`. Shared by every choice-based activity (count,
 * numeral, quicklook, onemore, add — §5.9).
 *
 * The order is **shuffled, never sorted**, so a tile's position can never leak
 * the correct answer. rng draw-order: distractor draws first (until the set is
 * full), then a Fisher–Yates shuffle.
 */
export function buildChoices(
  answer: number,
  choiceCount: number,
  max: number,
  rng: Rng,
): number[] {
  const set = new Set<number>([answer]);
  let guard = 0;
  while (set.size < choiceCount && guard < 500) {
    guard += 1;
    set.add(1 + Math.floor(rng() * max));
  }
  const arr = [...set];
  // Fisher–Yates shuffle in place.
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
