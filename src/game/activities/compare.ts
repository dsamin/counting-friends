import type { Level, ActivityModule, CompareRound } from './types';

/**
 * More or Fewer (§5.5) — "Tap the group with more!" (and "fewer" higher up).
 * Two groups of friends are shown; the child taps the group that has more (or
 * fewer) of them. Equal counts are NEVER generated.
 *
 * Level → knobs per the FINAL spec §5.5 / §6.3 table:
 *   L1-2 → max5,  asks ['more'],          minGap 2 (clearly different sizes)
 *   L3-4 → max10, asks ['more','fewer'],  minGap 1
 *   L5+  → max20, asks ['more','fewer'],  minGap 1
 *
 * rng draw-order: left, then right (redrawn until distinct from left AND the
 * gap meets minGap), then ask (index into the level's `asks` set). This pure
 * generator takes no character pool — it works in plain numbers.
 */
export function compareParams(level: Level): {
  max: number;
  asks: ('more' | 'fewer')[];
  minGap: number;
} {
  if (level <= 2) return { max: 5, asks: ['more'], minGap: 2 };
  if (level <= 4) return { max: 10, asks: ['more', 'fewer'], minGap: 1 };
  return { max: 20, asks: ['more', 'fewer'], minGap: 1 }; // L5+
}

export const compare: ActivityModule<CompareRound> = {
  id: 'compare',

  generate(level, rng) {
    const { max, asks, minGap } = compareParams(level);
    const left = 1 + Math.floor(rng() * max); // draw 1: left group size
    let right = 1 + Math.floor(rng() * max); // draw 2+: right, redrawn to fit
    let guard = 0;
    while ((right === left || Math.abs(left - right) < minGap) && guard < 500) {
      guard += 1;
      right = 1 + Math.floor(rng() * max);
    }
    const ask = asks[Math.floor(rng() * asks.length)]; // final draw: which question
    return { kind: 'compare', left, right, ask };
  },

  evaluate(round, answer) {
    if (answer.kind !== 'tile') return { correct: false, roundComplete: false };
    const target =
      round.ask === 'more'
        ? Math.max(round.left, round.right)
        : Math.min(round.left, round.right);
    const correct = answer.value === target;
    return { correct, roundComplete: correct }; // single-tap: complete === correct
  },

  prompt(round) {
    const line = `Tap the group with ${round.ask}!`;
    return { speech: line, aria: line };
  },
};
