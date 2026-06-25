import type { Level, ActivityModule, NumeralRound } from './types';
import { WORDS } from '../constants';
import { buildChoices } from './choices';

/**
 * Find the Number (§5.2) — "Find the {word}!" → tap the matching numeral tile.
 *
 * Level → knobs per the FINAL spec §6.3 table. `lookAlike` is ALWAYS false for
 * the release; the 6/9 look-alike distractor is a fast-follow (§5.2).
 *
 * rng draw-order: target, then distractors loop + shuffle (inside buildChoices).
 */
export function numeralParams(
  level: Level,
): { max: number; choiceCount: number; lookAlike: boolean } {
  if (level <= 1) return { max: 5, choiceCount: 3, lookAlike: false };
  if (level === 2) return { max: 5, choiceCount: 4, lookAlike: false };
  if (level === 3) return { max: 10, choiceCount: 4, lookAlike: false };
  if (level === 4) return { max: 10, choiceCount: 4, lookAlike: false };
  return { max: 20, choiceCount: 5, lookAlike: false }; // L5+
}

export const numeral: ActivityModule<NumeralRound> = {
  id: 'numeral',

  generate(level, rng) {
    const { max, choiceCount } = numeralParams(level);
    const target = 1 + Math.floor(rng() * max); // draw 1: the target numeral
    const choices = buildChoices(target, choiceCount, max, rng); // draws 2+: distractors, then shuffle
    return { kind: 'numeral', target, choices, lookAlike: false };
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
