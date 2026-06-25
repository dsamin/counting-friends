import type { ActivityId } from './activities/types';
import type { Character } from './types';
import { CHARACTERS } from './characters';

/**
 * Collectibles catalog + unlock rules (§8). Pure data + pure helpers. The art
 * (SVG `<symbol>`s) lives in CharacterDefs; the countable roster in characters.ts.
 * This module decides what is *available* vs *locked* and what crossing a star
 * threshold grants.
 */

export const BASE_FRIEND_KEYS = ['duck', 'cat', 'frog', 'bunny'] as const;

/** Activities renderable in this build (the registry is the source of truth). */
export const RELEASE_ACTIVITIES: ActivityId[] = ['count']; // grows as activities ship

export interface Pack {
  id: string;
  name: string;
  itemKeys: string[];
}

/** Themed packs of countable sprites. */
export const PACKS: Pack[] = [
  { id: 'shapes', name: 'Shapes', itemKeys: ['star', 'heart', 'circle'] },
];

export type Unlock =
  | { kind: 'friends'; keys: string[] }
  | { kind: 'pack'; id: string };

export interface UnlockThreshold {
  stars: number;
  unlock: Unlock;
}

/**
 * Star-gated unlocks (ascending). Exactly two — one friend path, one pack path
 * (§8). The first sits above an early streak-milestone star burst so a 3-in-a-row
 * reads as the name-bearing streak banner, not an unlock, then unlocks follow.
 */
export const UNLOCK_THRESHOLDS: UnlockThreshold[] = [
  { stars: 12, unlock: { kind: 'friends', keys: ['dog', 'owl', 'pig'] } },
  { stars: 24, unlock: { kind: 'pack', id: 'shapes' } },
];

export interface UnlocksState {
  friends: string[];
  packs: string[];
  activities: string[];
}

export function defaultUnlocks(): UnlocksState {
  return {
    friends: [...BASE_FRIEND_KEYS],
    packs: [],
    activities: [...RELEASE_ACTIVITIES],
  };
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}

/** The countable-character keys an unlock grants. */
export function keysForUnlock(u: Unlock): string[] {
  if (u.kind === 'friends') return u.keys;
  const pack = PACKS.find((p) => p.id === u.id);
  return pack ? pack.itemKeys : [];
}

/** Thresholds newly crossed when stars rise from `prevStars` to `nextStars`. */
export function newlyUnlocked(prevStars: number, nextStars: number): Unlock[] {
  return UNLOCK_THRESHOLDS.filter(
    (t) => t.stars > prevStars && t.stars <= nextStars,
  ).map((t) => t.unlock);
}

/** Apply an unlock to the unlocks state (immutably, deduped). */
export function applyUnlock(state: UnlocksState, u: Unlock): UnlocksState {
  if (u.kind === 'friends') {
    return { ...state, friends: dedupe([...state.friends, ...u.keys]) };
  }
  return { ...state, packs: dedupe([...state.packs, u.id]) };
}

/** All currently-available countable characters (base + unlocked friends + unlocked packs). */
export function unlockedCharacters(state: UnlocksState): Character[] {
  const keys = new Set<string>(state.friends);
  for (const pid of state.packs) {
    const pack = PACKS.find((p) => p.id === pid);
    if (pack) pack.itemKeys.forEach((k) => keys.add(k));
  }
  return CHARACTERS.filter((c) => keys.has(c.key));
}

/** Whether a character key is unlocked given the unlocks state. */
export function isCharacterUnlocked(state: UnlocksState, key: string): boolean {
  if (state.friends.includes(key)) return true;
  return state.packs.some((pid) => {
    const pack = PACKS.find((p) => p.id === pid);
    return pack ? pack.itemKeys.includes(key) : false;
  });
}

/** Every collectible character key (for the Sticker Book), in roster order. */
export function allCollectibleKeys(): string[] {
  return CHARACTERS.map((c) => c.key);
}
