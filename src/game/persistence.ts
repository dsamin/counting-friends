import type { Tier } from './types';
import type { ActivityId } from './activities/types';

const KEYS = {
  tier: 'cf_tier',
  name: 'cf_name',
  reduceMotion: 'cf_rm',
  voice: 'cf_voice',
} as const;

/** v2 schema keys — all JSON or numeric, all cf_-prefixed. */
const V2_KEYS = {
  schema: 'cf_schema',
  stars: 'cf_stars',
  streakBest: 'cf_streakBest',
  mastery: 'cf_mastery',
  unlocks: 'cf_unlocks',
  settings: 'cf_settings',
} as const;

const SCHEMA_VERSION = '2';

const VALID_TIERS: readonly Tier[] = ['easy', 'medium', 'hard'];

function isTier(value: string | null): value is Tier {
  return value !== null && (VALID_TIERS as readonly string[]).includes(value);
}

/** Read a key, swallowing any storage error (SSR / denied storage). */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Write a key, swallowing any storage error. Never throws. */
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage denied or unavailable — ignore */
  }
}

/** Remove a key, swallowing any storage error. Never throws. */
function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage denied or unavailable — ignore */
  }
}

export interface Prefs {
  tier: Tier;
  childName: string;
  reduceMotion: boolean;
  voiceOn: boolean;
}

export function loadPrefs(defaults: {
  tier: Tier;
  voiceEnabled: boolean;
  /**
   * Default reduce-motion when `cf_rm` is unset. Wire the OS
   * `prefers-reduced-motion` media query here so a reduce-motion user gets
   * calm defaults on first run. Defaults to false to preserve prior behavior.
   */
  reduceMotion?: boolean;
}): Prefs {
  const storedTier = read(KEYS.tier);
  const storedVoice = read(KEYS.voice);
  const storedRm = read(KEYS.reduceMotion);

  return {
    tier: isTier(storedTier) ? storedTier : defaults.tier,
    childName: read(KEYS.name) ?? '',
    // Stored user choice ('1'/'0') always wins; otherwise the OS default.
    reduceMotion:
      storedRm == null ? (defaults.reduceMotion ?? false) : storedRm === '1',
    voiceOn: storedVoice == null ? defaults.voiceEnabled : storedVoice !== '0',
  };
}

export function saveTier(t: Tier): void {
  write(KEYS.tier, t);
}

export function saveName(s: string): void {
  write(KEYS.name, s);
}

export function saveReduceMotion(b: boolean): void {
  write(KEYS.reduceMotion, b ? '1' : '0');
}

export function saveVoice(b: boolean): void {
  write(KEYS.voice, b ? '1' : '0');
}

// ---------------------------------------------------------------------------
// v2 state + migration (FINAL spec §10 / §10.1)
//
// Every key is read inside its own try/catch and JSON.parsed independently, so
// a single corrupt key falls back to its default without throwing or wiping any
// sibling key. Reuses the defensive `read`/`write`/`remove` helpers above.
// ---------------------------------------------------------------------------

export interface MasteryRecord {
  level: number;
  window: boolean[];
}

export interface CfSettings {
  /** single global pin; absent = "let the app decide" */
  levelOverride?: { global: number };
  /** absent = all unlocked */
  enabledActivities?: ActivityId[];
  /** absent/false = arithmetic hidden */
  arithmetic?: boolean;
}

export interface V2State {
  stars: number;
  streakBest: number;
  /** keyed by ActivityId */
  mastery: Record<string, MasteryRecord>;
  unlocks: { friends: string[]; packs: string[]; activities: string[] };
  settings: CfSettings;
}

export interface V2Defaults {
  stars: number;
  streakBest: number;
  mastery: Record<string, MasteryRecord>;
  unlocks: { friends: string[]; packs: string[]; activities: string[] };
  settings: CfSettings;
}

/**
 * Parse a JSON-valued key inside its own try/catch. On a missing key, a
 * parse error, or a NaN-yielding number, returns the provided default. The
 * caller passes `parse` to interpret the raw string (numbers vs JSON objects).
 * Never throws.
 */
function readKey<T>(key: string, fallback: T, parse: (raw: string) => T): T {
  const raw = read(key);
  if (raw == null) return fallback;
  try {
    return parse(raw);
  } catch {
    return fallback;
  }
}

function parseFiniteNumber(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error('not a finite number');
  return n;
}

/**
 * Load v2 state. JSON.parses EACH key inside its OWN try/catch; on ANY
 * parse/shape failure for a key, falls back to that key's default. Never
 * throws, never wipes a sibling key.
 */
export function loadV2State(defaults: V2Defaults): V2State {
  return {
    stars: readKey(V2_KEYS.stars, defaults.stars, parseFiniteNumber),
    streakBest: readKey(
      V2_KEYS.streakBest,
      defaults.streakBest,
      parseFiniteNumber,
    ),
    mastery: readKey(V2_KEYS.mastery, defaults.mastery, JSON.parse),
    unlocks: readKey(V2_KEYS.unlocks, defaults.unlocks, JSON.parse),
    settings: readKey(V2_KEYS.settings, defaults.settings, JSON.parse),
  };
}

export function saveStars(n: number): void {
  write(V2_KEYS.stars, String(n));
}

export function saveStreakBest(n: number): void {
  write(V2_KEYS.streakBest, String(n));
}

export function saveMastery(m: Record<string, MasteryRecord>): void {
  write(V2_KEYS.mastery, JSON.stringify(m));
}

export function saveUnlocks(u: V2State['unlocks']): void {
  write(V2_KEYS.unlocks, JSON.stringify(u));
}

export function saveSettings(s: CfSettings): void {
  write(V2_KEYS.settings, JSON.stringify(s));
}

/** Legacy tier → starting count level (§6.3 / §10.1). */
const TIER_TO_LEVEL: Record<Tier, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
};

/**
 * If `cf_schema !== "2"`: seed defaults into the v2 keys, map legacy
 * `cf_tier → starting level` (easy→1, medium→3, hard→5), keep
 * `cf_name`/`cf_voice`/`cf_rm`, and write `cf_schema="2"`. Returns the starting
 * level derived from the old tier, or `null` if there was no legacy tier.
 *
 * Idempotent: once the schema is `"2"`, a second call is a no-op and returns
 * `{ startingLevel: null }`, leaving existing progress untouched.
 */
export function migrateToV2(defaults: V2Defaults): {
  startingLevel: number | null;
} {
  if (read(V2_KEYS.schema) === SCHEMA_VERSION) {
    return { startingLevel: null };
  }

  // Seed the v2 keys with defaults (does not touch cf_name/cf_voice/cf_rm).
  saveStars(defaults.stars);
  saveStreakBest(defaults.streakBest);
  saveMastery(defaults.mastery);
  saveUnlocks(defaults.unlocks);
  saveSettings(defaults.settings);

  const storedTier = read(KEYS.tier);
  const startingLevel = isTier(storedTier) ? TIER_TO_LEVEL[storedTier] : null;

  write(V2_KEYS.schema, SCHEMA_VERSION);
  return { startingLevel };
}

/**
 * Clear ONLY the v2 keys (schema/stars/streakBest/mastery/unlocks/settings).
 * Keeps `cf_name`/`cf_voice`/`cf_rm`. Never throws.
 */
export function resetProgress(): void {
  remove(V2_KEYS.schema);
  remove(V2_KEYS.stars);
  remove(V2_KEYS.streakBest);
  remove(V2_KEYS.mastery);
  remove(V2_KEYS.unlocks);
  remove(V2_KEYS.settings);
}
