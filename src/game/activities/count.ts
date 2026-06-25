import type { Level, ActivityModule, CountRound } from './types';
import { CHARACTERS } from '../characters';
import { buildChoices } from './choices';

/**
 * Count It (§5.1) — "How many {plural}?" → tap the numeral. The reference
 * activity: it reproduces v1's counting game inside the v2 framework.
 *
 * Level → knobs per the FINAL spec §6.3 table.
 */
export function countParams(level: Level): { max: number; choiceCount: number } {
  if (level <= 1) return { max: 5, choiceCount: 3 };
  if (level === 2) return { max: 5, choiceCount: 4 };
  if (level === 3) return { max: 10, choiceCount: 4 };
  if (level === 4) return { max: 10, choiceCount: 5 };
  return { max: 20, choiceCount: 5 }; // L5+
}

export const count: ActivityModule<CountRound> = {
  id: 'count',

  generate(level, rng) {
    const { max, choiceCount } = countParams(level);
    const n = 1 + Math.floor(rng() * max); // draw 1: the count
    const animal = CHARACTERS[Math.floor(rng() * CHARACTERS.length)]; // draw 2: animal
    const choices = buildChoices(n, choiceCount, max, rng); // draws 3+: distractors, then shuffle
    return { kind: 'count', count: n, animal, choices };
  },

  evaluate(round, answer) {
    const correct = answer.kind === 'tile' && answer.value === round.count;
    return { correct, roundComplete: correct }; // single-tap: complete === correct
  },

  prompt(round) {
    const line = 'How many ' + round.animal.plural + '?';
    return { speech: line, aria: line };
  },
};
