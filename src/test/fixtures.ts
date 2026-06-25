import type { GameState } from '../game/gameState';
import type { Round } from '../game/activities/types';
import { CHARACTERS } from '../game/characters';
import { defaultUnlocks } from '../game/content';

/** Build a full GameState for component tests (override what you need). */
export function makeState(over: Partial<GameState> = {}): GameState {
  return {
    screen: 'play',
    activityId: 'count',
    round: null as Round | null,
    mastery: { count: { level: 1, window: [] } },
    streak: 0,
    stars: 0,
    unlocks: defaultUnlocks(),
    overlay: null,
    matchProgress: null,
    revealPhase: 'revealed',
    count: 0,
    choices: [],
    animal: CHARACTERS[0],
    status: 'asking',
    animatingValue: null,
    animType: null,
    animKey: 0,
    roundId: 1,
    gateProgress: 0,
    settingsOpen: false,
    childName: '',
    reduceMotion: false,
    voiceOn: true,
    speaking: false,
    ...over,
  };
}
