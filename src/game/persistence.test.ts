import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Tier } from './types';
import {
  loadPrefs,
  saveTier,
  saveName,
  saveReduceMotion,
  saveVoice,
} from './persistence';

const DEFAULTS: { tier: Tier; voiceEnabled: boolean } = {
  tier: 'easy',
  voiceEnabled: true,
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('loadPrefs', () => {
  it('returns defaults when storage is empty', () => {
    const prefs = loadPrefs(DEFAULTS);
    expect(prefs).toEqual({
      tier: 'easy',
      childName: '',
      reduceMotion: false,
      voiceOn: true,
    });
  });

  it('honors a custom default tier and voiceEnabled=false when storage empty', () => {
    const prefs = loadPrefs({ tier: 'hard', voiceEnabled: false });
    expect(prefs.tier).toBe('hard');
    expect(prefs.voiceOn).toBe(false);
  });

  it('falls back to default tier when stored value is invalid', () => {
    localStorage.setItem('cf_tier', 'nonsense');
    expect(loadPrefs(DEFAULTS).tier).toBe('easy');
  });

  it('accepts each valid stored tier', () => {
    for (const t of ['easy', 'medium', 'hard'] as Tier[]) {
      localStorage.setItem('cf_tier', t);
      expect(loadPrefs(DEFAULTS).tier).toBe(t);
    }
  });

  it('reads childName, empty string when absent', () => {
    expect(loadPrefs(DEFAULTS).childName).toBe('');
    localStorage.setItem('cf_name', 'Jayden');
    expect(loadPrefs(DEFAULTS).childName).toBe('Jayden');
  });

  it('treats only cf_rm === "1" as reduceMotion true', () => {
    expect(loadPrefs(DEFAULTS).reduceMotion).toBe(false);
    localStorage.setItem('cf_rm', '0');
    expect(loadPrefs(DEFAULTS).reduceMotion).toBe(false);
    localStorage.setItem('cf_rm', 'true');
    expect(loadPrefs(DEFAULTS).reduceMotion).toBe(false);
    localStorage.setItem('cf_rm', '1');
    expect(loadPrefs(DEFAULTS).reduceMotion).toBe(true);
  });

  it('voiceOn: null falls back to default, "0" is false, "1" is true', () => {
    // absent -> default (true)
    expect(loadPrefs(DEFAULTS).voiceOn).toBe(true);
    // absent with default false -> false
    expect(loadPrefs({ tier: 'easy', voiceEnabled: false }).voiceOn).toBe(false);
    // explicit "0" -> false (even if default true)
    localStorage.setItem('cf_voice', '0');
    expect(loadPrefs(DEFAULTS).voiceOn).toBe(false);
    // explicit "1" -> true (even if default false)
    localStorage.setItem('cf_voice', '1');
    expect(
      loadPrefs({ tier: 'easy', voiceEnabled: false }).voiceOn,
    ).toBe(true);
    // any non-"0" value -> true
    localStorage.setItem('cf_voice', 'on');
    expect(loadPrefs(DEFAULTS).voiceOn).toBe(true);
  });

  it('never throws when getItem throws (storage denied)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => loadPrefs(DEFAULTS)).not.toThrow();
    expect(loadPrefs(DEFAULTS)).toEqual({
      tier: 'easy',
      childName: '',
      reduceMotion: false,
      voiceOn: true,
    });
  });
});

describe('setters round-trip through loadPrefs', () => {
  it('saveTier persists and loads back', () => {
    saveTier('medium');
    expect(loadPrefs(DEFAULTS).tier).toBe('medium');
    expect(localStorage.getItem('cf_tier')).toBe('medium');
  });

  it('saveName persists and loads back', () => {
    saveName('Momo');
    expect(loadPrefs(DEFAULTS).childName).toBe('Momo');
    expect(localStorage.getItem('cf_name')).toBe('Momo');
  });

  it('saveReduceMotion writes "1"/"0" and loads back', () => {
    saveReduceMotion(true);
    expect(localStorage.getItem('cf_rm')).toBe('1');
    expect(loadPrefs(DEFAULTS).reduceMotion).toBe(true);
    saveReduceMotion(false);
    expect(localStorage.getItem('cf_rm')).toBe('0');
    expect(loadPrefs(DEFAULTS).reduceMotion).toBe(false);
  });

  it('saveVoice writes "1"/"0" and loads back', () => {
    saveVoice(false);
    expect(localStorage.getItem('cf_voice')).toBe('0');
    expect(loadPrefs(DEFAULTS).voiceOn).toBe(false);
    saveVoice(true);
    expect(localStorage.getItem('cf_voice')).toBe('1');
    expect(loadPrefs(DEFAULTS).voiceOn).toBe(true);
  });
});

describe('setters swallow storage errors', () => {
  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
  });

  it('saveTier does not throw', () => {
    expect(() => saveTier('hard')).not.toThrow();
  });
  it('saveName does not throw', () => {
    expect(() => saveName('Jayden')).not.toThrow();
  });
  it('saveReduceMotion does not throw', () => {
    expect(() => saveReduceMotion(true)).not.toThrow();
  });
  it('saveVoice does not throw', () => {
    expect(() => saveVoice(false)).not.toThrow();
  });
});
