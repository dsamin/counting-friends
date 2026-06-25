import type { Rng } from '../types';
import type { Level, ActivityModule, MatchRound, MatchItem } from './types';

/**
 * Match Up (§5.3) — the headline parent ask. Left column = groups of friends
 * (different quantities), right column = the matching numerals, both shuffled.
 * Tap-then-tap to link each group to its number.
 *
 * Level → knobs per the FINAL spec §6.3 table. `pairCount` is **capped at 3**
 * for the release (portrait-safe, §5.3/§12.2).
 *
 * rng draw-order:
 *   1. distinct-quantity draws — `1 + floor(rng()*max)` into a Set until it
 *      holds `pairCount` distinct values (loop).
 *   2. left-column Fisher–Yates shuffle.
 *   3. right-column Fisher–Yates shuffle (independent of the left).
 */
export function matchParams(level: Level): { pairCount: number; max: number } {
  if (level <= 1) return { pairCount: 2, max: 5 };
  if (level === 2) return { pairCount: 2, max: 5 };
  if (level === 3) return { pairCount: 3, max: 10 };
  if (level === 4) return { pairCount: 3, max: 10 };
  return { pairCount: 3, max: 20 }; // L5+ (pairCount capped at 3, §5.3/§12.2)
}

/** Fisher–Yates shuffle in place, driven by rng (one draw per swap). */
function shuffle<T>(arr: T[], rng: Rng): void {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

export const match: ActivityModule<MatchRound> = {
  id: 'match',

  generate(level, rng) {
    const { pairCount, max } = matchParams(level);

    // draw 1: pairCount distinct quantities in [1..max]
    const quantities = new Set<number>();
    let guard = 0;
    while (quantities.size < pairCount && guard < 500) {
      guard += 1;
      quantities.add(1 + Math.floor(rng() * max));
    }
    const values = [...quantities];

    // Build paired items: same index ⇒ same value ⇒ the solution.
    const left: MatchItem[] = values.map((value, i) => ({
      id: `L${i}`,
      kind: 'group',
      value,
    }));
    const right: MatchItem[] = values.map((value, i) => ({
      id: `R${i}`,
      kind: 'numeral',
      value,
    }));
    const solution: Record<string, string> = {};
    for (let i = 0; i < values.length; i += 1) solution[`L${i}`] = `R${i}`;

    // draws 2 & 3: shuffle each column independently (left first, then right).
    shuffle(left, rng);
    shuffle(right, rng);

    return { kind: 'match', variant: 'groupNum', left, right, solution };
  },

  evaluate(round, answer) {
    if (answer.kind !== 'pair') return { correct: false, roundComplete: false };
    const correct = round.solution[answer.leftId] === answer.rightId;
    // roundComplete is ALWAYS false here — the engine computes completion from
    // accumulated links (§5.3); the activity is stateless about completion.
    return { correct, roundComplete: false };
  },

  prompt() {
    const line = 'Match each group to its number!';
    return { speech: line, aria: line };
  },
};
