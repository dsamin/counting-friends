import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Rng, Tier } from './types';
import { generateRound, praiseLine, promptLine } from './round';
import { PRAISE, TIMING } from './constants';
import {
  saveName,
  saveReduceMotion,
  saveTier,
  saveVoice,
  loadPrefs,
} from './persistence';
import { type AudioEngine, silentAudio } from './audio';
import { type GameState, gateProgressFrom, initialState, reducer } from './gameState';
import { prefersReducedMotion } from './reduceMotion';

export interface UseGameOptions {
  audio?: AudioEngine;
  rng?: Rng;
  defaultTier?: Tier;
  voiceEnabled?: boolean;
}

export interface GameActions {
  pick(tier: Tier): void;
  choose(value: number): void;
  tapAnimal(): void;
  replay(): void;
  back(): void;
  gateDown(): void;
  gateUp(): void;
  closeSettings(): void;
  setName(name: string): void;
  toggleReduceMotion(): void;
  toggleVoice(): void;
}

/**
 * Orchestration hook: owns the reducer, all timers, the gate RAF loop, and the
 * wiring to the injected audio engine and persistence. Timers always read the
 * latest state via `stateRef`, never a stale render closure.
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
      // First-run default for the reduce-motion toggle: honor the OS
      // `prefers-reduced-motion` preference. SSR/old-browser safe.
      reduceMotion: prefersReducedMotion(),
    });
    return initialState(prefs, defaults);
  });

  // Latest state for timer/RAF callbacks (avoids stale closures).
  const stateRef = useRef(state);
  stateRef.current = state;

  // Timer + RAF handles.
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revertRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reaskRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gateRafRef = useRef<number | null>(null);

  // Stable refs for injected deps so callbacks don't churn.
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

  // Self-rearming idle re-prompt. Reads latest state via the ref.
  const startIdle = useCallback(() => {
    clearIdle();
    idleRef.current = setTimeout(() => {
      idleRef.current = null;
      const s = stateRef.current;
      if (s.screen === 'play' && s.status === 'asking' && !s.settingsOpen) {
        audioRef.current.speak(promptLine(s.animal));
      }
      // Re-arm regardless so the prompt repeats while the child idles.
      startIdle();
    }, TIMING.idle);
  }, [clearIdle]);

  const dealRound = useCallback(
    (tier: Tier) => {
      const round = generateRound(tier, rngRef.current);
      dispatch({ type: 'DEAL_ROUND', round });
      audioRef.current.speak(promptLine(round.animal));
      startIdle();
    },
    [startIdle],
  );

  const pick = useCallback(
    (tier: Tier) => {
      saveTier(tier);
      audioRef.current.ensureAudio();
      dispatch({ type: 'PICK_TIER', tier });
      dealRound(tier);
    },
    [dealRound],
  );

  const choose = useCallback(
    (value: number) => {
      const s = stateRef.current;
      if (s.status !== 'asking') return; // rapid-tap guard
      audioRef.current.ensureAudio();
      clearIdle();

      const correct = value === s.count;
      dispatch({ type: 'CHOOSE', value, correct });

      if (correct) {
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
          dealRound(stateRef.current.tier);
        }, delay);
      } else {
        audioRef.current.playWhoops();
        clearRevert();
        revertRef.current = setTimeout(() => {
          revertRef.current = null;
          dispatch({ type: 'CLEAR_ANIM' });
        }, TIMING.wrongRevert);
        clearReask();
        reaskRef.current = setTimeout(() => {
          reaskRef.current = null;
          const cur = stateRef.current;
          if (cur.status === 'asking') {
            audioRef.current.speak(promptLine(cur.animal));
          }
        }, TIMING.reask);
        // Note: do NOT re-arm idle on a wrong answer (matches prototype).
      }
    },
    [clearIdle, clearAdvance, clearRevert, clearReask, dealRound],
  );

  const tapAnimal = useCallback(() => {
    audioRef.current.ensureAudio();
    audioRef.current.playChirp();
    audioRef.current.speak(stateRef.current.animal.sound);
  }, []);

  const replay = useCallback(() => {
    audioRef.current.ensureAudio();
    audioRef.current.speak(promptLine(stateRef.current.animal));
  }, []);

  const back = useCallback(() => {
    clearAllTimers();
    cancelGate();
    audioRef.current.cancelSpeech();
    dispatch({ type: 'BACK' });
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

  // Wire the engine's speaking callback into state.
  useEffect(() => {
    audio.onSpeakingChange = (b: boolean) =>
      dispatch({ type: 'SET_SPEAKING', speaking: b });
    return () => {
      audio.onSpeakingChange = undefined;
    };
  }, [audio]);

  // Tear everything down on unmount.
  useEffect(() => {
    return () => {
      clearAllTimers();
      cancelGate();
      audioRef.current.cancelSpeech();
    };
  }, [clearAllTimers, cancelGate]);

  const actions = useMemo<GameActions>(
    () => ({
      pick,
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
      pick,
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

  return { state, actions };
}
