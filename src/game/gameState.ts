import type { Character, Status } from './types';
import type { ActivityId, Round } from './activities/types';
import type { MasteryRecord, Prefs } from './persistence';
import { CHARACTERS } from './characters';
import { TIMING } from './constants';

/**
 * The full v2 game state. Three top-level screens (`home` | `play` | `stickers`).
 * Difficulty is per-activity and adaptive (`mastery`), so v1's `tier` is gone.
 * `round` holds the active activity's round; `count`/`choices`/`animal` are
 * **derived conveniences** kept in sync by `DEAL_ROUND` for the count activity's
 * UI (the per-activity host split lands in a later phase). Animation fields drive
 * CSS retriggers; everything is serializable and the reducer never mutates.
 */
export interface GameState {
  screen: 'home' | 'play' | 'stickers';
  activityId: ActivityId;
  round: Round | null;
  /** Per-activity adaptive mastery (level + rolling outcome window). */
  mastery: Record<string, MasteryRecord>;
  /** Consecutive correct round-completes (feeds adaptive + reward callouts). */
  streak: number;

  // Derived count-activity conveniences (set by DEAL_ROUND).
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

/** Build the initial state from loaded prefs plus the loaded mastery map. */
export function initialState(
  prefs: Prefs,
  init: { mastery: Record<string, MasteryRecord>; activityId?: ActivityId },
): GameState {
  return {
    screen: 'home',
    activityId: init.activityId ?? 'count',
    round: null,
    mastery: init.mastery,
    streak: 0,
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
  | { type: 'ENTER_ACTIVITY'; activityId: ActivityId }
  | { type: 'GO_HOME' }
  | { type: 'DEAL_ROUND'; round: Round; activityId: ActivityId }
  | { type: 'CHOOSE'; value: number; correct: boolean }
  | { type: 'SET_STREAK'; streak: number }
  | { type: 'SET_MASTERY'; activityId: ActivityId; level: number; window: boolean[] }
  | { type: 'OPEN_STICKERS' }
  | { type: 'CLEAR_ANIM' }
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
    case 'ENTER_ACTIVITY':
      return { ...state, screen: 'play', activityId: action.activityId };

    case 'GO_HOME':
      return {
        ...state,
        screen: 'home',
        settingsOpen: false,
        status: 'asking',
        animatingValue: null,
        animType: null,
        gateProgress: 0,
        speaking: false,
      };

    case 'OPEN_STICKERS':
      return { ...state, screen: 'stickers', settingsOpen: false };

    case 'DEAL_ROUND': {
      const r = action.round;
      // Keep the count UI's flat fields in sync for the count activity.
      const flat =
        r.kind === 'count'
          ? { count: r.count, animal: r.animal, choices: r.choices }
          : { count: 0, choices: [] as number[], animal: state.animal };
      return {
        ...state,
        round: r,
        activityId: action.activityId,
        ...flat,
        status: 'asking',
        animatingValue: null,
        animType: null,
        roundId: state.roundId + 1,
      };
    }

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

    case 'SET_STREAK':
      return { ...state, streak: action.streak };

    case 'SET_MASTERY':
      return {
        ...state,
        mastery: {
          ...state.mastery,
          [action.activityId]: { level: action.level, window: action.window },
        },
      };

    case 'CLEAR_ANIM':
      return { ...state, animatingValue: null, animType: null };

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
