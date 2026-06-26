/**
 * Reward & collectibles rules (Counting Friends v2). Pinned by the FINAL spec §7.1–7.3.
 *
 * Pure functions only — no I/O, no timers, no React. The engine (`useGame`) owns
 * when these fire; this module owns the math and the copy.
 *
 * No-fail DNA (§2): stars only ever go up, and milestone callouts are warm,
 * effort-oriented, and never ability-labeling. Callouts are ACTIVITY-NEUTRAL —
 * a streak can follow any activity, so they never hard-code "counting".
 */
import { WORDS } from './constants';
import type { ActivityId } from './activities/types';

export const REWARDS = {
  starsPerRound: 1,
  streakMilestones: [3, 5, 8, 12, 20] as const,
  milestoneBonus: 3, // bonus stars at each streak milestone
  levelUpBonus: 2, // bonus stars on level-up
} as const;

/**
 * Stars to award for a completed round: base + milestone bonus + level-up bonus.
 * Pure. Per-round (not per-correct-pair) so the economy is uniform across
 * single-tap and multi-step activities (§7.1).
 */
export function starsForRound(opts: { milestone?: boolean; leveledUp?: boolean }): number {
  return (
    REWARDS.starsPerRound +
    (opts.milestone ? REWARDS.milestoneBonus : 0) +
    (opts.leveledUp ? REWARDS.levelUpBonus : 0)
  );
}

/** True iff `streak` is exactly one of REWARDS.streakMilestones. Pure. */
export function isStreakMilestone(streak: number): boolean {
  return (REWARDS.streakMilestones as readonly number[]).includes(streak);
}

/**
 * Spelled-out number word, capitalized, for in-range values; digits otherwise.
 * (WORDS covers 0..20.)
 */
function numberWord(n: number): string {
  if (n >= 0 && n < WORDS.length) {
    const word = WORDS[n];
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return String(n);
}

/**
 * Activity-aware, NAME-BEARING streak callout. Effort-oriented, never
 * ability-labeling. NEVER hard-codes "counting" (it may follow a non-counting
 * activity) and never contains the substring "count" (case-insensitive) so it
 * is safe after any activity. With no name, the name clause is dropped — and so
 * is any trailing comma/clause — mirroring v1 `praiseLine` behavior.
 *
 * `activityId` is accepted for the activity-aware seam; the released copy is
 * deliberately activity-neutral, so it does not branch on the id today.
 */
export function streakCallout(
  milestone: number,
  _activityId: ActivityId,
  name?: string,
): string {
  const word = numberWord(milestone);
  const hasName = !!name && name.length > 0;
  const inRow = `${word} in a row`;

  switch (milestone) {
    case 3:
      return hasName ? `${inRow}, ${name}! Great job!` : `${inRow}! Great job!`;
    case 5:
      return hasName ? `${inRow}, ${name} — you're amazing!` : `${inRow} — you're amazing!`;
    case 8:
      return hasName
        ? `Wow, ${name}! ${inRow}! You're a math star!`
        : `Wow! ${inRow}! You're a math star!`;
    case 12:
      return hasName ? `${inRow}, ${name}! Incredible!` : `${inRow}! Incredible!`;
    case 20:
      return hasName ? `${inRow}, ${name}! You're unstoppable!` : `${inRow}! You're unstoppable!`;
    default:
      // Generic line for any non-listed milestone: number + optional name.
      return hasName ? `${inRow}, ${name}! Way to go!` : `${inRow}! Way to go!`;
  }
}
