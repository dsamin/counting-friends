import type { Level, ActivityModule, OneMoreRound } from './types';
import { WORDS } from '../constants';
import { buildChoices } from './choices';

/**
 * One More / One Less (§5.7) — "Here are N. What is one more?" (or "one less")
 * → tap the numeral. Successor/predecessor: the foundation of addition, and a
 * mastery gate before `add` unlocks (§6.6).
 *
 * Level → knobs per the FINAL spec §5.7. A pure number generator: it never
 * counts characters, so the optional `pool` argument is ignored.
 *
 * rng draw-order: delta index, then base, then distractors loop + shuffle
 * (inside buildChoices).
 */
export function onemoreParams(
  level: Level,
): { max: number; deltas: (1 | -1)[]; choiceCount: number } {
  if (level <= 2) return { max: 5, deltas: [1], choiceCount: 3 };
  if (level <= 4) return { max: 10, deltas: [1, -1], choiceCount: 4 };
  return { max: 20, deltas: [1, -1], choiceCount: 4 }; // L5+
}

export const onemore: ActivityModule<OneMoreRound> = {
  id: 'onemore',

  generate(level, rng) {
    const { max, deltas, choiceCount } = onemoreParams(level);
    const delta = deltas[Math.floor(rng() * deltas.length)]; // draw 1: delta
    // Pick base so that base + delta ∈ [1..max]. Both branches draw uniformly
    // over a window of size (max - 1): +1 → [1..max-1]; -1 → [2..max].
    const lo = delta === 1 ? 1 : 2;
    const base = lo + Math.floor(rng() * (max - 1)); // draw 2: base
    const answer = base + delta;
    const choices = buildChoices(answer, choiceCount, max, rng); // draws 3+
    return { kind: 'onemore', base, delta, choices };
  },

  evaluate(round, answer) {
    const correct =
      answer.kind === 'tile' && answer.value === round.base + round.delta;
    return { correct, roundComplete: correct }; // single-tap: complete === correct
  },

  prompt(round) {
    const which = round.delta === 1 ? 'one more' : 'one less';
    const line = 'Here are ' + WORDS[round.base] + '. What is ' + which + '?';
    return { speech: line, aria: line };
  },
};
