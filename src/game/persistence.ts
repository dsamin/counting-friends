import type { Tier } from './types';

const KEYS = {
  tier: 'cf_tier',
  name: 'cf_name',
  reduceMotion: 'cf_rm',
  voice: 'cf_voice',
} as const;

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

export interface Prefs {
  tier: Tier;
  childName: string;
  reduceMotion: boolean;
  voiceOn: boolean;
}

export function loadPrefs(defaults: {
  tier: Tier;
  voiceEnabled: boolean;
}): Prefs {
  const storedTier = read(KEYS.tier);
  const storedVoice = read(KEYS.voice);

  return {
    tier: isTier(storedTier) ? storedTier : defaults.tier,
    childName: read(KEYS.name) ?? '',
    reduceMotion: read(KEYS.reduceMotion) === '1',
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
