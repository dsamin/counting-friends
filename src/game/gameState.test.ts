import { describe, it, expect } from 'vitest';
import type { Round } from './types';
import { CHARACTERS } from './characters';
import { TIMING } from './constants';
import {
  type GameState,
  initialState,
  reducer,
  gateProgressFrom,
} from './gameState';

const DEFAULTS = { defaultTier: 'easy' as const, voiceEnabled: true };

const PREFS = {
  tier: 'medium' as const,
  childName: 'Jayden',
  reduceMotion: false,
  voiceOn: true,
};

function freshState(overrides: Partial<GameState> = {}): GameState {
  return { ...initialState(PREFS, DEFAULTS), ...overrides };
}

const ROUND: Round = {
  count: 4,
  animal: CHARACTERS[1],
  choices: [2, 4, 6, 8],
};

describe('initialState', () => {
  it('builds a start-screen state from prefs', () => {
    const s = initialState(PREFS, DEFAULTS);
    expect(s).toEqual({
      screen: 'start',
      tier: 'medium',
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

  it('carries reduceMotion and voiceOn from prefs', () => {
    const s = initialState(
      { tier: 'hard', childName: '', reduceMotion: true, voiceOn: false },
      DEFAULTS,
    );
    expect(s.tier).toBe('hard');
    expect(s.reduceMotion).toBe(true);
    expect(s.voiceOn).toBe(false);
    expect(s.childName).toBe('');
  });
});

describe('reducer purity', () => {
  it('does not mutate the input state', () => {
    const s = freshState();
    const snapshot = JSON.parse(JSON.stringify(s));
    reducer(s, { type: 'DEAL_ROUND', round: ROUND });
    reducer(s, { type: 'CHOOSE', value: 4, correct: true });
    reducer(s, { type: 'GATE_PROGRESS', p: 0.5 });
    reducer(s, { type: 'TOGGLE_RM' });
    expect(s).toEqual(snapshot);
  });
});

describe('PICK_TIER', () => {
  it('moves to play and sets the tier', () => {
    const s = freshState({ screen: 'start', tier: 'easy' });
    const next = reducer(s, { type: 'PICK_TIER', tier: 'hard' });
    expect(next.screen).toBe('play');
    expect(next.tier).toBe('hard');
  });
});

describe('DEAL_ROUND', () => {
  it('loads round data, resets anim/status, bumps roundId', () => {
    const s = freshState({
      roundId: 3,
      status: 'correct',
      animatingValue: 9,
      animType: 'correct',
    });
    const next = reducer(s, { type: 'DEAL_ROUND', round: ROUND });
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

describe('CLEAR_ANIM', () => {
  it('clears animatingValue and animType', () => {
    const s = freshState({ animatingValue: 2, animType: 'wrong' });
    const next = reducer(s, { type: 'CLEAR_ANIM' });
    expect(next.animatingValue).toBeNull();
    expect(next.animType).toBeNull();
  });
});

describe('BACK', () => {
  it('returns to start and resets transient fields', () => {
    const s = freshState({
      screen: 'play',
      settingsOpen: true,
      status: 'correct',
      animatingValue: 7,
      speaking: true,
      tier: 'hard',
      childName: 'Jayden',
    });
    const next = reducer(s, { type: 'BACK' });
    expect(next.screen).toBe('start');
    expect(next.settingsOpen).toBe(false);
    expect(next.status).toBe('asking');
    expect(next.animatingValue).toBeNull();
    expect(next.speaking).toBe(false);
    // preserved
    expect(next.tier).toBe('hard');
    expect(next.childName).toBe('Jayden');
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
