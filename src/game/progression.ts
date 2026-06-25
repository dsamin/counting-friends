/**
 * Adaptive progression engine — pure transitions (FINAL spec §6.1/§6.2).
 *
 * The engine keeps a rolling window of round outcomes (one per round, first
 * attempt only) plus the current Level. `applyAttempt` maintains the window;
 * `nextLevel` decides level-up / ease-back. Both are pure and fully testable.
 *
 * The exact numbers are non-load-bearing — sane defaults, hand-tune after
 * watching the real child. Tests assert relative to these constants.
 */
import type { Level } from './activities/types';

export const PROGRESSION = {
  window: 6, // rolling outcomes per activity
  levelUp: { minCorrect: 5, ofLast: 6, cleanStreak: 4 }, // 5/6 OR a clean run of 4
  easeBack: { maxCorrect: 2, ofLast: 6 }, // ≤2 of most-recent 6
  cooldownRounds: 2, // no up/down within 2 rounds of a change
  fastFirstClimb: 3, // first level-up out of L1 after just 3 correct
  maxLevel: 8,
} as const;

/** Count `true` values in the last `n` entries of `window`. */
function recentTrueCount(window: boolean[], n: number): number {
  const start = Math.max(0, window.length - n);
  let count = 0;
  for (let i = start; i < window.length; i++) {
    if (window[i]) count++;
  }
  return count;
}

/**
 * Push `correct` onto the rolling window; cap length at PROGRESSION.window
 * (drop oldest). Pure — returns a new array, never mutates the input.
 */
export function applyAttempt(window: boolean[], correct: boolean): boolean[] {
  const next = [...window, correct];
  if (next.length > PROGRESSION.window) {
    next.splice(0, next.length - PROGRESSION.window);
  }
  return next;
}

/**
 * Decide the next level. Pure. Evaluation order (spec §6.1):
 *   1. Cooldown — block any change too soon after a previous change.
 *   2. Level-up — fast first climb / window gate / clean streak.
 *   3. Ease-back (silent) — only once there is enough data.
 *   4. Otherwise — no change.
 * `leveledUp` is true ONLY on an upward transition (drives the spoken
 * celebration); ease-back is always silent.
 */
export function nextLevel(
  current: Level,
  window: boolean[],
  streak: number,
  roundsSinceChange: number,
): { level: Level; leveledUp: boolean } {
  // 1. Cooldown.
  if (roundsSinceChange < PROGRESSION.cooldownRounds) {
    return { level: current, leveledUp: false };
  }

  // 2. Level-up.
  if (current < PROGRESSION.maxLevel) {
    const recentTrue = recentTrueCount(window, PROGRESSION.levelUp.ofLast);
    const totalTrue = window.reduce((acc, v) => acc + (v ? 1 : 0), 0);
    const fastClimb = current === 1 && totalTrue >= PROGRESSION.fastFirstClimb;
    const windowGate = recentTrue >= PROGRESSION.levelUp.minCorrect;
    const streakGate = streak >= PROGRESSION.levelUp.cleanStreak;
    if (fastClimb || windowGate || streakGate) {
      return { level: current + 1, leveledUp: true };
    }
  }

  // 3. Ease-back (silent) — only with enough data.
  if (
    window.length >= PROGRESSION.easeBack.ofLast &&
    recentTrueCount(window, PROGRESSION.easeBack.ofLast) <= PROGRESSION.easeBack.maxCorrect &&
    current > 1
  ) {
    return { level: Math.max(1, current - 1), leveledUp: false };
  }

  // 4. No change.
  return { level: current, leveledUp: false };
}
