import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Rng, Tier } from './types';
import type { ActivityId } from './activities/types';
import { getActivity, ACTIVITIES } from './activities';
import { praiseLine } from './round';
import { PRAISE, TIMING } from './constants';
import {
  saveName,
  saveReduceMotion,
  saveVoice,
  loadPrefs,
  loadV2State,
  migrateToV2,
  saveMastery,
  type MasteryRecord,
  type V2Defaults,
} from './persistence';
import { applyAttempt, nextLevel } from './progression';
import { type AudioEngine, silentAudio } from './audio';
import {
  type GameState,
  gateProgressFrom,
  initialState,
  reducer,
} from './gameState';
import { prefersReducedMotion } from './reduceMotion';

export interface UseGameOptions {
  audio?: AudioEngine;
  rng?: Rng;
  defaultTier?: Tier;
  voiceEnabled?: boolean;
}

export interface GameActions {
  enterActivity(activityId: ActivityId): void;
  choose(value: number): void;
  tapAnimal(): void;
  replay(): void;
  back(): void; // → home
  gateDown(): void;
  gateUp(): void;
  closeSettings(): void;
  setName(name: string): void;
  toggleReduceMotion(): void;
  toggleVoice(): void;
}

/** Friends always available; release activities (grows as phases land). */
const BASE_FRIENDS = ['duck', 'cat', 'frog', 'bunny'];
/** Activities available in this build (the registry decides what's renderable). */
const RELEASE_ACTIVITIES: ActivityId[] = ['count'];

function makeV2Defaults(startLevel: number): V2Defaults {
  const mastery: Record<string, MasteryRecord> = {};
  for (const id of RELEASE_ACTIVITIES) mastery[id] = { level: startLevel, window: [] };
  return {
    stars: 0,
    streakBest: 0,
    mastery,
    unlocks: { friends: [...BASE_FRIENDS], packs: [], activities: [...RELEASE_ACTIVITIES] },
    settings: {},
  };
}

/**
 * Orchestration hook: owns the reducer, all timers, the gate RAF loop, the
 * adaptive level/mastery bookkeeping, and the wiring to the injected audio
 * engine and persistence. Timers always read the latest state via `stateRef`,
 * never a stale render closure.
 */
export function useGame(options: UseGameOptions = {}): {
  state: GameState;
  actions: GameActions;
} {
  const audio = options.audio ?? silentAudio;
  const rng = options.rng ?? Math.random;
  const defaults = useMemo(
    () => ({
      defaultTier: options.defaultTier ?? 'easy',
      voiceEnabled: options.voiceEnabled ?? true,
    }),
    [options.defaultTier, options.voiceEnabled],
  );

  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const prefs = loadPrefs({
      tier: defaults.defaultTier,
      voiceEnabled: defaults.voiceEnabled,
      reduceMotion: prefersReducedMotion(),
    });
    // Migrate v1 → v2 (maps the last-played tier to a starting level so a child
    // who outgrew v1 doesn't restart at level 1), then load v2 state.
    const migration = migrateToV2(makeV2Defaults(1));
    const v2 = loadV2State(makeV2Defaults(migration.startingLevel ?? 1));
    if (migration.startingLevel != null && v2.mastery.count) {
      v2.mastery.count.level = migration.startingLevel;
      saveMastery(v2.mastery);
    }
    return initialState(prefs, { mastery: v2.mastery, activityId: 'count' });
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revertRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reaskRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gateRafRef = useRef<number | null>(null);
  /** True until the current round's first-attempt outcome has been recorded. */
  const firstAttemptRef = useRef(true);
  /** Rounds since the last level change, per activity (no-oscillation cooldown). */
  const sinceChangeRef = useRef<Record<string, number>>({});

  const audioRef = useRef(audio);
  audioRef.current = audio;
  const rngRef = useRef(rng);
  rngRef.current = rng;

  const clearIdle = useCallback(() => {
    if (idleRef.current !== null) {
      clearTimeout(idleRef.current);
      idleRef.current = null;
    }
  }, []);
  const clearAdvance = useCallback(() => {
    if (advanceRef.current !== null) {
      clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }, []);
  const clearRevert = useCallback(() => {
    if (revertRef.current !== null) {
      clearTimeout(revertRef.current);
      revertRef.current = null;
    }
  }, []);
  const clearReask = useCallback(() => {
    if (reaskRef.current !== null) {
      clearTimeout(reaskRef.current);
      reaskRef.current = null;
    }
  }, []);
  const cancelGate = useCallback(() => {
    if (gateRafRef.current !== null) {
      cancelAnimationFrame(gateRafRef.current);
      gateRafRef.current = null;
    }
  }, []);
  const clearAllTimers = useCallback(() => {
    clearIdle();
    clearAdvance();
    clearRevert();
    clearReask();
  }, [clearIdle, clearAdvance, clearRevert, clearReask]);

  /** Speak the active round's prompt (any activity). */
  const speakPrompt = useCallback(() => {
    const s = stateRef.current;
    if (!s.round) return;
    const activity = getActivity(s.activityId);
    audioRef.current.speak(
      activity.prompt(s.round, s.childName || undefined).speech,
    );
  }, []);

  // Self-rearming idle re-prompt. Reads latest state via the ref.
  const startIdle = useCallback(() => {
    clearIdle();
    idleRef.current = setTimeout(() => {
      idleRef.current = null;
      const s = stateRef.current;
      if (s.screen === 'play' && s.status === 'asking' && !s.settingsOpen) {
        speakPrompt();
      }
      startIdle();
    }, TIMING.idle);
  }, [clearIdle, speakPrompt]);

  /** Current adaptive level for an activity (defaults to 1). */
  const levelFor = useCallback((activityId: ActivityId): number => {
    return stateRef.current.mastery[activityId]?.level ?? 1;
  }, []);

  const dealRound = useCallback(
    (activityId: ActivityId) => {
      const activity = getActivity(activityId);
      const round = activity.generate(levelFor(activityId), rngRef.current);
      dispatch({ type: 'DEAL_ROUND', round, activityId });
      firstAttemptRef.current = true;
      audioRef.current.speak(
        activity.prompt(round, stateRef.current.childName || undefined).speech,
      );
      startIdle();
    },
    [levelFor, startIdle],
  );

  const enterActivity = useCallback(
    (activityId: ActivityId) => {
      audioRef.current.ensureAudio();
      dispatch({ type: 'ENTER_ACTIVITY', activityId });
      dealRound(activityId);
    },
    [dealRound],
  );

  /** Record a round's first-attempt outcome: streak + adaptive mastery. */
  const recordOutcome = useCallback((activityId: ActivityId, correct: boolean) => {
    const s = stateRef.current;
    const newStreak = correct ? s.streak + 1 : 0;
    dispatch({ type: 'SET_STREAK', streak: newStreak });

    const prev = s.mastery[activityId] ?? { level: 1, window: [] };
    const window = applyAttempt(prev.window, correct);
    const since = sinceChangeRef.current[activityId] ?? Infinity;
    const { level, leveledUp } = nextLevel(prev.level, window, newStreak, since);
    sinceChangeRef.current[activityId] =
      level === prev.level ? since + 1 : 0;

    dispatch({ type: 'SET_MASTERY', activityId, level, window });
    const nextMastery = { ...s.mastery, [activityId]: { level, window } };
    saveMastery(nextMastery);
    return { leveledUp };
  }, []);

  const choose = useCallback(
    (value: number) => {
      const s = stateRef.current;
      if (s.status !== 'asking' || !s.round) return; // rapid-tap guard
      audioRef.current.ensureAudio();
      clearIdle();

      const activity = getActivity(s.activityId);
      const { correct, roundComplete } = activity.evaluate(s.round, {
        kind: 'tile',
        value,
      });
      dispatch({ type: 'CHOOSE', value, correct });

      // One adaptive outcome per round — the first attempt only.
      if (firstAttemptRef.current) {
        firstAttemptRef.current = false;
        recordOutcome(s.activityId, correct);
      }

      if (correct && roundComplete) {
        audioRef.current.playPop();
        const praise = praiseLine(
          s.count,
          PRAISE[Math.floor(rngRef.current() * PRAISE.length)],
          s.childName || undefined,
        );
        audioRef.current.speak(praise);
        const delay = s.reduceMotion
          ? TIMING.advanceReduceMotion
          : TIMING.advance;
        clearAdvance();
        advanceRef.current = setTimeout(() => {
          advanceRef.current = null;
          dealRound(stateRef.current.activityId);
        }, delay);
      } else if (!correct) {
        audioRef.current.playWhoops();
        clearRevert();
        revertRef.current = setTimeout(() => {
          revertRef.current = null;
          dispatch({ type: 'CLEAR_ANIM' });
        }, TIMING.wrongRevert);
        clearReask();
        reaskRef.current = setTimeout(() => {
          reaskRef.current = null;
          if (stateRef.current.status === 'asking') speakPrompt();
        }, TIMING.reask);
        // Note: do NOT re-arm idle on a wrong answer (matches v1).
      }
    },
    [clearIdle, clearAdvance, clearRevert, clearReask, dealRound, recordOutcome, speakPrompt],
  );

  const tapAnimal = useCallback(() => {
    audioRef.current.ensureAudio();
    audioRef.current.playChirp();
    audioRef.current.speak(stateRef.current.animal.sound);
  }, []);

  const replay = useCallback(() => {
    audioRef.current.ensureAudio();
    speakPrompt();
  }, [speakPrompt]);

  const back = useCallback(() => {
    clearAllTimers();
    cancelGate();
    audioRef.current.cancelSpeech();
    dispatch({ type: 'GO_HOME' });
  }, [clearAllTimers, cancelGate]);

  const gateDown = useCallback(() => {
    cancelGate();
    const start = performance.now();
    const tick = () => {
      const p = gateProgressFrom(performance.now() - start);
      dispatch({ type: 'GATE_PROGRESS', p });
      if (p >= 1) {
        gateRafRef.current = null;
        dispatch({ type: 'GATE_OPEN' });
        return;
      }
      gateRafRef.current = requestAnimationFrame(tick);
    };
    gateRafRef.current = requestAnimationFrame(tick);
  }, [cancelGate]);

  const gateUp = useCallback(() => {
    cancelGate();
    const p = stateRef.current.gateProgress;
    if (p > 0 && p < 1) {
      dispatch({ type: 'GATE_RESET' });
    }
  }, [cancelGate]);

  const closeSettings = useCallback(() => {
    dispatch({ type: 'CLOSE_SETTINGS' });
  }, []);

  const setName = useCallback((name: string) => {
    dispatch({ type: 'SET_NAME', name });
    saveName(name);
  }, []);

  const toggleReduceMotion = useCallback(() => {
    const next = !stateRef.current.reduceMotion;
    dispatch({ type: 'TOGGLE_RM' });
    saveReduceMotion(next);
  }, []);

  const toggleVoice = useCallback(() => {
    const next = !stateRef.current.voiceOn;
    dispatch({ type: 'TOGGLE_VOICE' });
    saveVoice(next);
    if (!next) {
      audioRef.current.cancelSpeech();
    }
  }, []);

  useEffect(() => {
    audio.onSpeakingChange = (b: boolean) =>
      dispatch({ type: 'SET_SPEAKING', speaking: b });
    return () => {
      audio.onSpeakingChange = undefined;
    };
  }, [audio]);

  useEffect(() => {
    return () => {
      clearAllTimers();
      cancelGate();
      audioRef.current.cancelSpeech();
    };
  }, [clearAllTimers, cancelGate]);

  const actions = useMemo<GameActions>(
    () => ({
      enterActivity,
      choose,
      tapAnimal,
      replay,
      back,
      gateDown,
      gateUp,
      closeSettings,
      setName,
      toggleReduceMotion,
      toggleVoice,
    }),
    [
      enterActivity,
      choose,
      tapAnimal,
      replay,
      back,
      gateDown,
      gateUp,
      closeSettings,
      setName,
      toggleReduceMotion,
      toggleVoice,
    ],
  );

  // Expose the registry-backed available activities for the Home Board.
  void ACTIVITIES;

  return { state, actions };
}
