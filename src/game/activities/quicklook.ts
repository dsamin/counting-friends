import type { Level, ActivityModule, QuickLookRound } from './types';
import { buildChoices } from './choices';

/**
 * Quick Look (§5.4) — subitize: friends/dots flash for `revealMs`, then hide and
 * the child taps how many they saw.
 *
 * Level → knobs per the FINAL spec §6.3 / §5.4 table. HARD RULE (§5.9): a
 * sub-second reveal (`revealMs < 1000`) is never paired with `max > 5`.
 * `choiceCount = Math.min(4, max)`.
 *
 * rng draw-order: count, then distractors loop + shuffle (inside buildChoices).
 */
export function quicklookParams(level: Level): {
  max: number;
  choiceCount: number;
  arrangement: 'dice' | 'random';
  revealMs: number;
} {
  let max: number;
  let arrangement: 'dice' | 'random';
  let revealMs: number;
  if (level <= 1) {
    max = 4;
    arrangement = 'dice';
    revealMs = 1000;
  } else if (level === 2) {
    max = 4;
    arrangement = 'dice';
    revealMs = 900;
  } else if (level === 3) {
    max = 5;
    arrangement = 'dice';
    revealMs = 1100;
  } else if (level === 4) {
    max = 5;
    arrangement = 'random';
    revealMs = 1000;
  } else if (level === 5) {
    max = 8;
    arrangement = 'random';
    revealMs = 1500;
  } else {
    max = 10; // L6+
    arrangement = 'random';
    revealMs = 1500;
  }
  return { max, choiceCount: Math.min(4, max), arrangement, revealMs };
}

export const quicklook: ActivityModule<QuickLookRound> = {
  id: 'quicklook',

  generate(level, rng) {
    const { max, choiceCount, arrangement, revealMs } = quicklookParams(level);
    const count = 1 + Math.floor(rng() * max); // draw 1: the count
    const choices = buildChoices(count, choiceCount, max, rng); // draws 2+: distractors, then shuffle
    return { kind: 'quicklook', count, choices, revealMs, arrangement };
  },

  evaluate(round, answer) {
    const correct = answer.kind === 'tile' && answer.value === round.count;
    return { correct, roundComplete: correct }; // single-tap: complete === correct
  },

  prompt() {
    const line = 'Quick! How many did you see?';
    return { speech: line, aria: line };
  },
};
