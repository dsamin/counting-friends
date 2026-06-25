import type { ActivityId, ActivityModule, Round } from './types';
import { count } from './count';
import { numeral } from './numeral';
import { quicklook } from './quicklook';
import { match } from './match';

/**
 * Activity registry. The engine only ever holds `ActivityModule<Round>`; each
 * module narrows on its `round.kind` internally (the interface's method-shaped
 * params are bivariant, so a specific `ActivityModule<CountRound>` registers as
 * `ActivityModule<Round>` without a cast — §4.1).
 *
 * Partial — activities are filled in as phases land (§4.6). `getActivity` throws
 * on an unregistered id so a wiring mistake fails loudly in tests.
 */
export const ACTIVITIES: Partial<Record<ActivityId, ActivityModule<Round>>> = {
  count,
  numeral,
  quicklook,
  match,
};

export function getActivity(id: ActivityId): ActivityModule<Round> {
  const mod = ACTIVITIES[id];
  if (!mod) {
    throw new Error(`No activity registered for id: ${id}`);
  }
  return mod;
}
