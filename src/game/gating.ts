import type { ActivityId } from './activities/types';
import type { MasteryRecord, CfSettings } from './persistence';
import type { UnlocksState } from './content';
import { ACTIVITIES } from './activities';

/**
 * Which activities are offered on the Home Board, and the arithmetic gate (§6.6).
 *
 * Number-sense + ordering activities come from `unlocks.activities`. Arithmetic
 * (`onemore`, `add`) is HIDDEN until either the parent flips the settings toggle
 * OR the child crosses a mastery bar — so it can appear automatically when he's
 * ready, while a grown-up can also opt in early. Only ever returns activities
 * that are actually registered (renderable).
 */
export const ARITHMETIC_ACTIVITIES: ActivityId[] = ['onemore', 'add'];

function levelOf(mastery: Record<string, MasteryRecord>, id: ActivityId): number {
  return mastery[id]?.level ?? 1;
}

/** Whether each arithmetic activity is unlocked given mastery + settings. */
export function arithmeticUnlocked(
  mastery: Record<string, MasteryRecord>,
  settings: CfSettings,
): { onemore: boolean; add: boolean } {
  const toggle = settings.arithmetic === true;
  // One More/One Less: needs solid number sense + quantity↔symbol mapping.
  const onemoreGate =
    levelOf(mastery, 'count') >= 4 &&
    levelOf(mastery, 'numeral') >= 3 &&
    levelOf(mastery, 'match') >= 2;
  const onemore = toggle || onemoreGate;
  // Add & Take Away: successor/predecessor (onemore) must be mastered first.
  const add = onemore && (toggle || levelOf(mastery, 'onemore') >= 2);
  return { onemore, add };
}

/** The ordered list of activity tiles to show on the Home Board. */
export function availableActivities(
  unlocks: UnlocksState,
  mastery: Record<string, MasteryRecord>,
  settings: CfSettings,
): ActivityId[] {
  const registered = new Set(Object.keys(ACTIVITIES));
  const result = unlocks.activities.filter((id) =>
    registered.has(id),
  ) as ActivityId[];
  const arith = arithmeticUnlocked(mastery, settings);
  if (arith.onemore && registered.has('onemore') && !result.includes('onemore')) {
    result.push('onemore');
  }
  if (arith.add && registered.has('add') && !result.includes('add')) {
    result.push('add');
  }
  return result;
}
