import type { Level, ActivityModule, AddRound } from './types';
import type { Rng } from '../types';
import { WORDS } from '../constants';
import { buildChoices } from './choices';

/**
 * Add & Take Away (§5.8) — "{a} and {b} more. How many altogether?" (join) or
 * "{a} take away {b}. How many are left?" (separate) → tap the result numeral.
 *
 * Level → knobs per the FINAL spec §5.8 / §6.3 table:
 *   L1–2 → within-5 addition only (result ≤ 5, addends ≤ 4), 3 choices;
 *   L3+  → within-10, addition AND subtraction, 4 choices.
 *
 * rng draw-order: op, then addends (a then b), then the choices helper
 * (distractor draws loop, then shuffle). Changing draw order is allowed only
 * with the fuzz tests as the primary guard (§5.9).
 */
export function addParams(level: Level): {
  max: number;
  ops: ('+' | '-')[];
  choiceCount: number;
} {
  if (level <= 1) return { max: 5, ops: ['+'], choiceCount: 3 };
  if (level === 2) return { max: 5, ops: ['+'], choiceCount: 3 };
  // L3+ — within-10, joining and separating.
  return { max: 10, ops: ['+', '-'], choiceCount: 4 };
}

/**
 * Build shuffled answer tiles for `add`. Unlike the shared `buildChoices`
 * (range `[1..max]`), subtraction results can be 0, and the §5.9 contract puts
 * `add` distractors in `[0..max]`. So when the result is 0 we seed it directly
 * and draw distractors from `[0..max]`; otherwise the shared helper (whose
 * `[1..max]` range already covers every non-zero result) does the work.
 */
function buildAddChoices(
  result: number,
  choiceCount: number,
  max: number,
  rng: Rng,
): number[] {
  if (result > 0) return buildChoices(result, choiceCount, max, rng);
  // result === 0: include 0, fill distractors from [0..max], then shuffle.
  const set = new Set<number>([0]);
  let guard = 0;
  while (set.size < choiceCount && guard < 500) {
    guard += 1;
    set.add(Math.floor(rng() * (max + 1))); // [0..max]
  }
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** Capitalize the first letter of a word (matches round.ts/rewards.ts idiom). */
function cap(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export const add: ActivityModule<AddRound> = {
  id: 'add',

  generate(level, rng) {
    const { max, ops, choiceCount } = addParams(level);
    const op = ops[Math.floor(rng() * ops.length)]; // draw 1: operation
    const withinFiveFloor = max === 5;

    let a: number;
    let b: number;
    let result: number;

    if (op === '+') {
      // Join: pick a,b >= 1 with a+b <= max. within-5 floor: a,b <= 4, a+b <= 5.
      const addendMax = withinFiveFloor ? 4 : max - 1;
      a = 1 + Math.floor(rng() * addendMax); // draw 2: first addend
      const sumCap = withinFiveFloor ? 5 : max;
      // b in [1 .. min(addendMax, sumCap - a)] so a+b stays in range.
      const bMax = Math.min(addendMax, sumCap - a);
      b = 1 + Math.floor(rng() * bMax); // draw 3: second addend
      result = a + b;
    } else {
      // Separate: minuend m in [2..max], subtrahend s in [1..m-1]; m-s >= 1.
      const m = 2 + Math.floor(rng() * (max - 1)); // draw 2: minuend
      const s = 1 + Math.floor(rng() * (m - 1)); // draw 3: subtrahend (< m)
      a = m;
      b = s;
      result = m - s;
    }

    const choices = buildAddChoices(result, choiceCount, max, rng); // draws 4+
    return { kind: 'add', a, b, op, choices };
  },

  evaluate(round, answer) {
    const result = round.op === '+' ? round.a + round.b : round.a - round.b;
    const correct = answer.kind === 'tile' && answer.value === result;
    return { correct, roundComplete: correct }; // single-tap: complete === correct
  },

  prompt(round) {
    const line =
      round.op === '+'
        ? `${cap(WORDS[round.a])} and ${WORDS[round.b]} more. How many altogether?`
        : `${cap(WORDS[round.a])} take away ${WORDS[round.b]}. How many are left?`;
    return { speech: line, aria: line };
  },
};
