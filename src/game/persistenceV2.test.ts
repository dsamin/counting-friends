import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadPrefs } from './persistence';
import {
  loadV2State,
  saveStars,
  saveStreakBest,
  saveMastery,
  saveUnlocks,
  saveSettings,
  migrateToV2,
  resetProgress,
  type V2Defaults,
  type V2State,
  type MasteryRecord,
} from './persistence';

/**
 * Fresh defaults each call so tests can mutate freely without cross-talk.
 * Mirrors the real engine's seed shape (empty mastery, base unlocks, no settings).
 */
function makeDefaults(): V2Defaults {
  return {
    stars: 0,
    streakBest: 0,
    mastery: {},
    unlocks: { friends: [], packs: [], activities: ['count'] },
    settings: {},
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('loadV2State', () => {
  it('returns defaults when storage is empty', () => {
    const defaults = makeDefaults();
    const state = loadV2State(defaults);
    expect(state).toEqual<V2State>({
      stars: 0,
      streakBest: 0,
      mastery: {},
      unlocks: { friends: [], packs: [], activities: ['count'] },
      settings: {},
    });
  });

  it('round-trips saveStars', () => {
    saveStars(42);
    expect(loadV2State(makeDefaults()).stars).toBe(42);
    expect(localStorage.getItem('cf_stars')).toBe('42');
  });

  it('round-trips saveStreakBest', () => {
    saveStreakBest(7);
    expect(loadV2State(makeDefaults()).streakBest).toBe(7);
    expect(localStorage.getItem('cf_streakBest')).toBe('7');
  });

  it('round-trips saveMastery', () => {
    const mastery: Record<string, MasteryRecord> = {
      count: { level: 3, window: [true, false, true] },
      numeral: { level: 1, window: [] },
    };
    saveMastery(mastery);
    expect(loadV2State(makeDefaults()).mastery).toEqual(mastery);
  });

  it('round-trips saveUnlocks', () => {
    const unlocks = {
      friends: ['fox', 'owl'],
      packs: ['forest'],
      activities: ['count', 'numeral'],
    };
    saveUnlocks(unlocks);
    expect(loadV2State(makeDefaults()).unlocks).toEqual(unlocks);
  });

  it('round-trips saveSettings', () => {
    const settings = {
      levelOverride: { global: 4 },
      enabledActivities: ['count', 'add'] as const,
      arithmetic: true,
    };
    saveSettings({
      levelOverride: { global: 4 },
      enabledActivities: ['count', 'add'],
      arithmetic: true,
    });
    expect(loadV2State(makeDefaults()).settings).toEqual(settings);
  });

  it('round-trips a full state via all setters at once', () => {
    saveStars(10);
    saveStreakBest(5);
    saveMastery({ count: { level: 2, window: [true, true] } });
    saveUnlocks({ friends: ['bear'], packs: [], activities: ['count', 'match'] });
    saveSettings({ arithmetic: true });

    expect(loadV2State(makeDefaults())).toEqual<V2State>({
      stars: 10,
      streakBest: 5,
      mastery: { count: { level: 2, window: [true, true] } },
      unlocks: { friends: ['bear'], packs: [], activities: ['count', 'match'] },
      settings: { arithmetic: true },
    });
  });
});

describe('loadV2State malformed-JSON fallback', () => {
  it('falls back to the default for a corrupt cf_mastery without throwing or wiping others', () => {
    // Good neighbors that must survive a bad cf_mastery.
    saveStars(99);
    saveUnlocks({ friends: ['fox'], packs: ['p'], activities: ['count'] });
    saveSettings({ arithmetic: true });
    // Corrupt only mastery.
    localStorage.setItem('cf_mastery', '{not json');

    const defaults = makeDefaults();
    let state!: V2State;
    expect(() => {
      state = loadV2State(defaults);
    }).not.toThrow();

    // Corrupt key -> its default.
    expect(state.mastery).toEqual(defaults.mastery);
    // Other keys are untouched.
    expect(state.stars).toBe(99);
    expect(state.unlocks).toEqual({ friends: ['fox'], packs: ['p'], activities: ['count'] });
    expect(state.settings).toEqual({ arithmetic: true });
  });

  it('falls back independently for corrupt cf_settings and cf_unlocks', () => {
    saveStars(3);
    saveMastery({ count: { level: 1, window: [] } });
    localStorage.setItem('cf_settings', '{not json');
    localStorage.setItem('cf_unlocks', 'also-not-json}}}');

    const defaults = makeDefaults();
    let state!: V2State;
    expect(() => {
      state = loadV2State(defaults);
    }).not.toThrow();

    expect(state.settings).toEqual(defaults.settings);
    expect(state.unlocks).toEqual(defaults.unlocks);
    // Valid keys are preserved.
    expect(state.stars).toBe(3);
    expect(state.mastery).toEqual({ count: { level: 1, window: [] } });
  });

  it('falls back when a numeric key is non-numeric garbage', () => {
    localStorage.setItem('cf_stars', 'banana');
    const defaults = makeDefaults();
    expect(loadV2State(defaults).stars).toBe(defaults.stars);
  });

  it('never throws when getItem throws (storage denied) and returns defaults', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const defaults = makeDefaults();
    expect(() => loadV2State(defaults)).not.toThrow();
    expect(loadV2State(defaults)).toEqual(defaults);
  });
});

describe('migrateToV2', () => {
  const PREFS_DEFAULTS = { tier: 'easy' as const, voiceEnabled: true };

  it('migrates legacy tier=medium -> startingLevel 3 and preserves name/voice/rm', () => {
    localStorage.setItem('cf_tier', 'medium');
    localStorage.setItem('cf_name', 'Jayden');
    localStorage.setItem('cf_voice', '0');
    localStorage.setItem('cf_rm', '1');

    const result = migrateToV2(makeDefaults());
    expect(result).toEqual({ startingLevel: 3 });

    // Schema is written.
    expect(localStorage.getItem('cf_schema')).toBe('2');

    // Old prefs preserved (asserted via the existing loadPrefs and raw keys).
    const prefs = loadPrefs(PREFS_DEFAULTS);
    expect(prefs.childName).toBe('Jayden');
    expect(prefs.voiceOn).toBe(false);
    expect(prefs.reduceMotion).toBe(true);
    expect(localStorage.getItem('cf_name')).toBe('Jayden');
    expect(localStorage.getItem('cf_voice')).toBe('0');
    expect(localStorage.getItem('cf_rm')).toBe('1');
  });

  it('maps easy -> 1 and hard -> 5', () => {
    localStorage.setItem('cf_tier', 'easy');
    expect(migrateToV2(makeDefaults())).toEqual({ startingLevel: 1 });

    localStorage.clear();
    localStorage.setItem('cf_tier', 'hard');
    expect(migrateToV2(makeDefaults())).toEqual({ startingLevel: 5 });
  });

  it('seeds defaults into the v2 keys on first migration', () => {
    localStorage.setItem('cf_tier', 'easy');
    const defaults = makeDefaults();
    defaults.unlocks = { friends: ['seed'], packs: [], activities: ['count'] };

    migrateToV2(defaults);

    const state = loadV2State(makeDefaults());
    expect(state.unlocks).toEqual({ friends: ['seed'], packs: [], activities: ['count'] });
  });

  it('returns startingLevel null when there is no legacy tier', () => {
    const result = migrateToV2(makeDefaults());
    expect(result).toEqual({ startingLevel: null });
    expect(localStorage.getItem('cf_schema')).toBe('2');
  });

  it('is idempotent: once schema is "2", a second call is a no-op returning null', () => {
    localStorage.setItem('cf_tier', 'medium');
    const first = migrateToV2(makeDefaults());
    expect(first).toEqual({ startingLevel: 3 });

    // Mutate the seeded state to detect any clobbering on a second call.
    saveStars(123);

    const second = migrateToV2(makeDefaults());
    expect(second).toEqual({ startingLevel: null });
    // Existing progress untouched by the idempotent re-run.
    expect(loadV2State(makeDefaults()).stars).toBe(123);
  });

  it('does not throw when storage is denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => migrateToV2(makeDefaults())).not.toThrow();
  });
});

describe('resetProgress', () => {
  it('clears v2 keys but keeps cf_name/cf_voice/cf_rm', () => {
    // Seed both v2 progress and the kept prefs.
    saveStars(50);
    saveStreakBest(8);
    saveMastery({ count: { level: 4, window: [true] } });
    saveUnlocks({ friends: ['fox'], packs: ['p'], activities: ['count', 'add'] });
    saveSettings({ arithmetic: true });
    localStorage.setItem('cf_schema', '2');
    localStorage.setItem('cf_name', 'Jayden');
    localStorage.setItem('cf_voice', '0');
    localStorage.setItem('cf_rm', '1');

    resetProgress();

    // v2 keys gone.
    for (const key of [
      'cf_schema',
      'cf_stars',
      'cf_streakBest',
      'cf_mastery',
      'cf_unlocks',
      'cf_settings',
    ]) {
      expect(localStorage.getItem(key)).toBeNull();
    }

    // Kept prefs survive.
    expect(localStorage.getItem('cf_name')).toBe('Jayden');
    expect(localStorage.getItem('cf_voice')).toBe('0');
    expect(localStorage.getItem('cf_rm')).toBe('1');

    // And loadV2State now returns defaults.
    const defaults = makeDefaults();
    expect(loadV2State(defaults)).toEqual(defaults);
  });

  it('does not throw when storage is denied', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => resetProgress()).not.toThrow();
  });
});
