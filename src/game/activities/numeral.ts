import type { Level, ActivityModule, NumeralRound } from './types';
import type { Rng } from '../types';
import { WORDS } from '../constants';
import { buildChoices } from './choices';

/**
 * Find the Number (§5.2) — "Find the {word}!" → tap the matching numeral tile.
 *
 * Level → knobs per the FINAL spec §6.3 table. From numeral **L3+**, when the
 * target is one of a genuinely-confusable orientation pair (6/9), the look-alike
 * partner is forced into the choices and the round is flagged `lookAlike` so the
 * UI draws an orientation anchor under the numerals (6/9 are never shown without
 * one — §5.2). For any other target the round is an ordinary, non-look-alike one.
 *
 * rng draw-order: target, then distractors loop + shuffle.
 */
export const CONFUSABLE_PAIRS: [number, number][] = [[6, 9]];

const CONFUSABLE = new Map<number, number>();
for (const [a, b] of CONFUSABLE_PAIRS) {
  CONFUSABLE.set(a, b);
  CONFUSABLE.set(b, a);
}

export function numeralParams(
  level: Level,
): { max: number; choiceCount: number; lookAlike: boolean } {
  if (level <= 1) return { max: 5, choiceCount: 3, lookAlike: false };
  if (level === 2) return { max: 5, choiceCount: 4, lookAlike: false };
  if (level === 3) return { max: 10, choiceCount: 4, lookAlike: true };
  if (level === 4) return { max: 10, choiceCount: 4, lookAlike: true };
  return { max: 20, choiceCount: 5, lookAlike: true }; // L5+
}

/** Build choices that force the confusable partner in, then shuffle. */
function lookAlikeChoices(
  target: number,
  partner: number,
  choiceCount: number,
  max: number,
  rng: Rng,
): number[] {
  const set = new Set<number>([target, partner]);
  let guard = 0;
  while (set.size < choiceCount && guard < 500) {
    guard += 1;
    set.add(1 + Math.floor(rng() * max));
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

export const numeral: ActivityModule<NumeralRound> = {
  id: 'numeral',

  generate(level, rng) {
    const { max, choiceCount, lookAlike } = numeralParams(level);
    const target = 1 + Math.floor(rng() * max); // draw 1: the target numeral
    const partner = lookAlike ? CONFUSABLE.get(target) : undefined;
    const usePartner = partner != null && partner <= max && partner !== target;
    const choices = usePartner
      ? lookAlikeChoices(target, partner, choiceCount, max, rng)
      : buildChoices(target, choiceCount, max, rng); // draws 2+: distractors, then shuffle
    return { kind: 'numeral', target, choices, lookAlike: usePartner };
  },

  evaluate(round, answer) {
    const correct = answer.kind === 'tile' && answer.value === round.target;
    return { correct, roundComplete: correct }; // single-tap: complete === correct
  },

  prompt(round) {
    const line = 'Find the ' + WORDS[round.target] + '!';
    return { speech: line, aria: line };
  },
};
