import { describe, it, expect } from 'vitest';
import { getCharacter } from './characters';
import { REWARDS } from './rewards';
import {
  PACKS,
  UNLOCK_THRESHOLDS,
  BASE_FRIEND_KEYS,
  defaultUnlocks,
  keysForUnlock,
  newlyUnlocked,
  applyUnlock,
  unlockedCharacters,
  allCollectibleKeys,
} from './content';

describe('content catalog integrity (§8.1)', () => {
  it('has unique pack ids and pack item keys that resolve to characters', () => {
    const ids = PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pack of PACKS) {
      for (const key of pack.itemKeys) {
        expect(() => getCharacter(key as never)).not.toThrow();
      }
    }
  });

  it('always includes the base friends in the default unlocks', () => {
    const d = defaultUnlocks();
    for (const k of BASE_FRIEND_KEYS) expect(d.friends).toContain(k);
  });

  it('every unlock threshold resolves to registered characters', () => {
    for (const t of UNLOCK_THRESHOLDS) {
      const keys = keysForUnlock(t.unlock);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(() => getCharacter(key as never)).not.toThrow();
      }
    }
  });

  it('thresholds are sorted ascending, positive, and reachable by the star economy', () => {
    const stars = UNLOCK_THRESHOLDS.map((t) => t.stars);
    expect(stars).toEqual([...stars].sort((a, b) => a - b));
    for (const s of stars) expect(s).toBeGreaterThan(0);
    // Reachable: stars only ever go up by at least starsPerRound each round.
    expect(REWARDS.starsPerRound).toBeGreaterThan(0);
  });

  it('exercises both unlock code paths (a friend unlock and a pack unlock)', () => {
    const kinds = new Set(UNLOCK_THRESHOLDS.map((t) => t.unlock.kind));
    expect(kinds.has('friends')).toBe(true);
    expect(kinds.has('pack')).toBe(true);
  });
});

describe('newlyUnlocked', () => {
  it('returns thresholds crossed when stars rise', () => {
    const first = UNLOCK_THRESHOLDS[0];
    const crossed = newlyUnlocked(first.stars - 1, first.stars);
    expect(crossed).toContainEqual(first.unlock);
  });
  it('returns nothing when no threshold is crossed', () => {
    expect(newlyUnlocked(0, 1)).toEqual([]);
  });
  it('does not re-report an already-passed threshold', () => {
    const first = UNLOCK_THRESHOLDS[0];
    expect(newlyUnlocked(first.stars, first.stars + 1)).not.toContainEqual(
      first.unlock,
    );
  });
});

describe('applyUnlock + unlockedCharacters', () => {
  it('adds friends and packs immutably and resolves their characters', () => {
    const base = defaultUnlocks();
    const friendUnlock = UNLOCK_THRESHOLDS.find((t) => t.unlock.kind === 'friends')!;
    const next = applyUnlock(base, friendUnlock.unlock);
    expect(next).not.toBe(base);
    const keys = keysForUnlock(friendUnlock.unlock);
    for (const k of keys) expect(next.friends).toContain(k);
    const chars = unlockedCharacters(next).map((c) => c.key);
    for (const k of keys) expect(chars).toContain(k);
  });

  it('base unlocked characters are exactly the base friends', () => {
    const chars = unlockedCharacters(defaultUnlocks()).map((c) => c.key);
    expect(new Set(chars)).toEqual(new Set(BASE_FRIEND_KEYS));
  });

  it('dedupes repeated unlocks', () => {
    const base = defaultUnlocks();
    const u = { kind: 'friends' as const, keys: ['dog'] };
    const once = applyUnlock(base, u);
    const twice = applyUnlock(once, u);
    expect(twice.friends.filter((k) => k === 'dog')).toHaveLength(1);
  });
});

describe('allCollectibleKeys', () => {
  it('includes every base friend and every threshold-granted key', () => {
    const all = allCollectibleKeys();
    for (const k of BASE_FRIEND_KEYS) expect(all).toContain(k);
    for (const t of UNLOCK_THRESHOLDS) {
      for (const k of keysForUnlock(t.unlock)) expect(all).toContain(k);
    }
  });
});
