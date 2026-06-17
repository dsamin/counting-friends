import type { Character, Round, Status, Tier } from './types';
import { CHARACTERS } from './characters';
import { TIMING } from './constants';
import type { Prefs } from './persistence';

/**
 * The full game state. Two top-level screens; while playing, a single round
 * is in flight. Animation fields drive CSS retriggers; `gateProgress` powers
 * the long-press settings gate. Everything is serializable and the reducer
 * never mutates it — see `reducer`.
 */
export interface GameState {
  screen: 'start' | 'play';
  tier: Tier;
  count: number;
  choices: number[];
  animal: Character;
  status: Status; // 'asking' | 'correct'
  animatingValue: number | null;
  animType: 'correct' | 'wrong' | null;
  animKey: number; // bump to retrigger a CSS animation
  roundId: number; // bump per round (keys the animal slots)
  gateProgress: number; // 0..1
  settingsOpen: boolean;
  childName: string;
  reduceMotion: boolean;
  voiceOn: boolean;
  speaking: boolean;
}

/** Build the initial state from loaded prefs plus app defaults. */
export function initialState(
  prefs: Prefs,
  _defaults: { defaultTier: Tier; voiceEnabled: boolean },
): GameState {
  return {
    screen: 'start',
    tier: prefs.tier,
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
    childName: prefs.childName,
    reduceMotion: prefs.reduceMotion,
    voiceOn: prefs.voiceOn,
    speaking: false,
  };
}

export type Action =
  | { type: 'PICK_TIER'; tier: Tier }
  | { type: 'DEAL_ROUND'; round: Round }
  | { type: 'CHOOSE'; value: number; correct: boolean }
  | { type: 'CLEAR_ANIM' }
  | { type: 'BACK' }
  | { type: 'GATE_PROGRESS'; p: number }
  | { type: 'GATE_OPEN' }
  | { type: 'GATE_RESET' }
  | { type: 'CLOSE_SETTINGS' }
  | { type: 'SET_NAME'; name: string }
  | { type: 'TOGGLE_RM' }
  | { type: 'TOGGLE_VOICE' }
  | { type: 'SET_SPEAKING'; speaking: boolean };

/** Pure reducer. Returns the same reference when nothing changes. */
export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'PICK_TIER':
      return { ...state, screen: 'play', tier: action.tier };

    case 'DEAL_ROUND':
      return {
        ...state,
        count: action.round.count,
        animal: action.round.animal,
        choices: action.round.choices,
        status: 'asking',
        animatingValue: null,
        animType: null,
        roundId: state.roundId + 1,
      };

    case 'CHOOSE': {
      // Rapid-tap guard: only an asking round accepts a choice.
      if (state.status !== 'asking') return state;
      return {
        ...state,
        animatingValue: action.value,
        animType: action.correct ? 'correct' : 'wrong',
        animKey: state.animKey + 1,
        status: action.correct ? 'correct' : state.status,
      };
    }

    case 'CLEAR_ANIM':
      return { ...state, animatingValue: null, animType: null };

    case 'BACK':
      return {
        ...state,
        screen: 'start',
        settingsOpen: false,
        status: 'asking',
        animatingValue: null,
        gateProgress: 0,
        speaking: false,
      };

    case 'GATE_PROGRESS':
      return { ...state, gateProgress: action.p };

    case 'GATE_OPEN':
      return { ...state, settingsOpen: true, gateProgress: 0 };

    case 'GATE_RESET':
      return { ...state, gateProgress: 0 };

    case 'CLOSE_SETTINGS':
      return { ...state, settingsOpen: false };

    case 'SET_NAME':
      return { ...state, childName: action.name };

    case 'TOGGLE_RM':
      return { ...state, reduceMotion: !state.reduceMotion };

    case 'TOGGLE_VOICE':
      return { ...state, voiceOn: !state.voiceOn };

    case 'SET_SPEAKING':
      return { ...state, speaking: action.speaking };

    default:
      return state;
  }
}

/** Linear 0..1 gate progress, clamped, for `elapsedMs` of the hold. */
export function gateProgressFrom(
  elapsedMs: number,
  holdMs: number = TIMING.gateHold,
): number {
  return Math.min(1, elapsedMs / holdMs);
}
