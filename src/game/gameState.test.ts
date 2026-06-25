import { describe, it, expect } from 'vitest';
import type { CountRound } from './activities/types';
import type { MasteryRecord } from './persistence';
import { defaultUnlocks } from './content';
import { CHARACTERS } from './characters';
import { TIMING } from './constants';
import {
  type GameState,
  initialState,
  reducer,
  gateProgressFrom,
} from './gameState';

const MASTERY: Record<string, MasteryRecord> = {
  count: { level: 1, window: [] },
};
const INIT = { mastery: MASTERY, activityId: 'count' as const };

const PREFS = {
  tier: 'medium' as const,
  childName: 'Jayden',
  reduceMotion: false,
  voiceOn: true,
};

function freshState(overrides: Partial<GameState> = {}): GameState {
  return { ...initialState(PREFS, INIT), ...overrides };
}

const ROUND: CountRound = {
  kind: 'count',
  count: 4,
  animal: CHARACTERS[1],
  choices: [2, 4, 6, 8],
};

describe('initialState', () => {
  it('builds a home-screen state from prefs + mastery', () => {
    const s = initialState(PREFS, INIT);
    expect(s).toEqual({
      screen: 'home',
      activityId: 'count',
      round: null,
      mastery: MASTERY,
      streak: 0,
      stars: 0,
      unlocks: defaultUnlocks(),
      overlay: null,
      count: 0,
      choices: [],
      animal: CHARACTERS[0],
      status: 'asking',
      animatingValue: null,
      animType: null,
      animKey: 0,
      roundId: 0,
      gateProgress: 0,
      settingsOpen: false,
      childName: 'Jayden',
      reduceMotion: false,
      voiceOn: true,
      speaking: false,
    });
  });

  it('carries reduceMotion, voiceOn, and name from prefs', () => {
    const s = initialState(
      { tier: 'hard', childName: '', reduceMotion: true, voiceOn: false },
      INIT,
    );
    expect(s.screen).toBe('home');
    expect(s.reduceMotion).toBe(true);
    expect(s.voiceOn).toBe(false);
    expect(s.childName).toBe('');
  });
});

describe('reducer purity', () => {
  it('does not mutate the input state', () => {
    const s = freshState();
    const snapshot = JSON.parse(JSON.stringify(s));
    reducer(s, { type: 'DEAL_ROUND', round: ROUND, activityId: 'count' });
    reducer(s, { type: 'CHOOSE', value: 4, correct: true });
    reducer(s, { type: 'GATE_PROGRESS', p: 0.5 });
    reducer(s, { type: 'TOGGLE_RM' });
    reducer(s, { type: 'SET_MASTERY', activityId: 'count', level: 2, window: [true] });
    expect(s).toEqual(snapshot);
  });
});

describe('ENTER_ACTIVITY', () => {
  it('moves to play and sets the activity', () => {
    const s = freshState({ screen: 'home' });
    const next = reducer(s, { type: 'ENTER_ACTIVITY', activityId: 'count' });
    expect(next.screen).toBe('play');
    expect(next.activityId).toBe('count');
  });
});

describe('DEAL_ROUND', () => {
  it('stores the round, derives flat count fields, resets anim, bumps roundId', () => {
    const s = freshState({
      roundId: 3,
      status: 'correct',
      animatingValue: 9,
      animType: 'correct',
    });
    const next = reducer(s, { type: 'DEAL_ROUND', round: ROUND, activityId: 'count' });
    expect(next.round).toBe(ROUND);
    expect(next.activityId).toBe('count');
    expect(next.count).toBe(4);
    expect(next.animal).toBe(CHARACTERS[1]);
    expect(next.choices).toEqual([2, 4, 6, 8]);
    expect(next.status).toBe('asking');
    expect(next.animatingValue).toBeNull();
    expect(next.animType).toBeNull();
    expect(next.roundId).toBe(4);
  });
});

describe('CHOOSE', () => {
  it('correct sets anim + status correct and bumps animKey', () => {
    const s = freshState({ status: 'asking', animKey: 1, count: 4 });
    const next = reducer(s, { type: 'CHOOSE', value: 4, correct: true });
    expect(next.animatingValue).toBe(4);
    expect(next.animType).toBe('correct');
    expect(next.animKey).toBe(2);
    expect(next.status).toBe('correct');
  });

  it('wrong sets anim but keeps status asking', () => {
    const s = freshState({ status: 'asking', animKey: 1, count: 4 });
    const next = reducer(s, { type: 'CHOOSE', value: 2, correct: false });
    expect(next.animatingValue).toBe(2);
    expect(next.animType).toBe('wrong');
    expect(next.animKey).toBe(2);
    expect(next.status).toBe('asking');
  });

  it('rapid-tap guard: no change when status is not asking', () => {
    const s = freshState({ status: 'correct', animKey: 5 });
    const next = reducer(s, { type: 'CHOOSE', value: 7, correct: true });
    expect(next).toBe(s);
  });
});

describe('streak + mastery actions', () => {
  it('SET_STREAK sets the streak', () => {
    expect(reducer(freshState(), { type: 'SET_STREAK', streak: 5 }).streak).toBe(5);
  });

  it('SET_MASTERY replaces the activity record', () => {
    const next = reducer(freshState(), {
      type: 'SET_MASTERY',
      activityId: 'count',
      level: 3,
      window: [true, true, false],
    });
    expect(next.mastery.count).toEqual({ level: 3, window: [true, true, false] });
  });
});

describe('reward actions', () => {
  it('AWARD_STARS raises the star total but never lowers it (monotonic)', () => {
    const s = freshState({ stars: 5 });
    expect(reducer(s, { type: 'AWARD_STARS', stars: 8 }).stars).toBe(8);
    // A lower value can never decrease the count.
    expect(reducer(s, { type: 'AWARD_STARS', stars: 2 }).stars).toBe(5);
  });

  it('SET_UNLOCKS replaces the unlocks state', () => {
    const unlocks = { friends: ['duck', 'dog'], packs: ['shapes'], activities: ['count'] };
    expect(reducer(freshState(), { type: 'SET_UNLOCKS', unlocks }).unlocks).toEqual(
      unlocks,
    );
  });

  it('SHOW_OVERLAY / CLOSE_OVERLAY set and clear the active overlay', () => {
    const shown = reducer(freshState(), {
      type: 'SHOW_OVERLAY',
      overlay: { kind: 'celebrate', line: 'Five in a row!' },
    });
    expect(shown.overlay).toEqual({ kind: 'celebrate', line: 'Five in a row!' });
    expect(reducer(shown, { type: 'CLOSE_OVERLAY' }).overlay).toBeNull();
  });

  it('dealing a fresh round clears any overlay', () => {
    const s = freshState({ overlay: { kind: 'unlock', characterKey: 'dog' } });
    const next = reducer(s, { type: 'DEAL_ROUND', round: ROUND, activityId: 'count' });
    expect(next.overlay).toBeNull();
  });
});

describe('CLEAR_ANIM', () => {
  it('clears animatingValue and animType', () => {
    const s = freshState({ animatingValue: 2, animType: 'wrong' });
    const next = reducer(s, { type: 'CLEAR_ANIM' });
    expect(next.animatingValue).toBeNull();
    expect(next.animType).toBeNull();
  });
});

describe('GO_HOME', () => {
  it('returns to home and resets transient fields, preserving streak + name', () => {
    const s = freshState({
      screen: 'play',
      settingsOpen: true,
      status: 'correct',
      animatingValue: 7,
      gateProgress: 0.6,
      speaking: true,
      streak: 3,
      childName: 'Jayden',
    });
    const next = reducer(s, { type: 'GO_HOME' });
    expect(next.screen).toBe('home');
    expect(next.settingsOpen).toBe(false);
    expect(next.status).toBe('asking');
    expect(next.animatingValue).toBeNull();
    // A partially-filled gate ring must not persist back on the home screen.
    expect(next.gateProgress).toBe(0);
    expect(next.speaking).toBe(false);
    // preserved across navigation
    expect(next.streak).toBe(3);
    expect(next.childName).toBe('Jayden');
  });
});

describe('OPEN_STICKERS', () => {
  it('opens the sticker book screen', () => {
    const next = reducer(freshState({ screen: 'home' }), { type: 'OPEN_STICKERS' });
    expect(next.screen).toBe('stickers');
  });
});

describe('gate actions', () => {
  it('GATE_PROGRESS sets progress', () => {
    const next = reducer(freshState(), { type: 'GATE_PROGRESS', p: 0.42 });
    expect(next.gateProgress).toBe(0.42);
  });

  it('GATE_OPEN opens settings and zeroes progress', () => {
    const s = freshState({ gateProgress: 1 });
    const next = reducer(s, { type: 'GATE_OPEN' });
    expect(next.settingsOpen).toBe(true);
    expect(next.gateProgress).toBe(0);
  });

  it('GATE_RESET zeroes progress', () => {
    const s = freshState({ gateProgress: 0.6 });
    const next = reducer(s, { type: 'GATE_RESET' });
    expect(next.gateProgress).toBe(0);
  });

  it('CLOSE_SETTINGS closes settings', () => {
    const s = freshState({ settingsOpen: true });
    const next = reducer(s, { type: 'CLOSE_SETTINGS' });
    expect(next.settingsOpen).toBe(false);
  });
});

describe('settings field actions', () => {
  it('SET_NAME sets childName', () => {
    const next = reducer(freshState(), { type: 'SET_NAME', name: 'Mia' });
    expect(next.childName).toBe('Mia');
  });

  it('TOGGLE_RM flips reduceMotion', () => {
    const off = freshState({ reduceMotion: false });
    expect(reducer(off, { type: 'TOGGLE_RM' }).reduceMotion).toBe(true);
    const on = freshState({ reduceMotion: true });
    expect(reducer(on, { type: 'TOGGLE_RM' }).reduceMotion).toBe(false);
  });

  it('TOGGLE_VOICE flips voiceOn', () => {
    const on = freshState({ voiceOn: true });
    expect(reducer(on, { type: 'TOGGLE_VOICE' }).voiceOn).toBe(false);
    const off = freshState({ voiceOn: false });
    expect(reducer(off, { type: 'TOGGLE_VOICE' }).voiceOn).toBe(true);
  });

  it('SET_SPEAKING sets speaking', () => {
    expect(
      reducer(freshState(), { type: 'SET_SPEAKING', speaking: true }).speaking,
    ).toBe(true);
    expect(
      reducer(freshState({ speaking: true }), {
        type: 'SET_SPEAKING',
        speaking: false,
      }).speaking,
    ).toBe(false);
  });
});

describe('gateProgressFrom', () => {
  it('is linear up to the hold', () => {
    expect(gateProgressFrom(0)).toBe(0);
    expect(gateProgressFrom(TIMING.gateHold / 2)).toBeCloseTo(0.5);
    expect(gateProgressFrom(TIMING.gateHold)).toBe(1);
  });

  it('clamps at 1 past the hold', () => {
    expect(gateProgressFrom(TIMING.gateHold * 2)).toBe(1);
    expect(gateProgressFrom(999999)).toBe(1);
  });

  it('accepts a custom hold', () => {
    expect(gateProgressFrom(500, 1000)).toBe(0.5);
    expect(gateProgressFrom(1500, 1000)).toBe(1);
  });
});
