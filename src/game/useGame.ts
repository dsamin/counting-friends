import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Rng, Tier } from './types';
import type { ActivityId, AnswerPayload } from './activities/types';
import { getActivity, ACTIVITIES } from './activities';
import { praiseLine } from './round';
import { getCharacter } from './characters';
import { PRAISE, TIMING, WORDS } from './constants';
import {
  saveName,
  saveReduceMotion,
  saveVoice,
  loadPrefs,
  loadV2State,
  migrateToV2,
  saveMastery,
  saveStars,
  saveStreakBest,
  saveUnlocks,
  saveSettings,
  type MasteryRecord,
  type V2Defaults,
} from './persistence';
import { applyAttempt, nextLevel } from './progression';
import { starsForRound, isStreakMilestone, streakCallout } from './rewards';
import {
  defaultUnlocks,
  unlockedCharacters,
  newlyUnlocked,
  applyUnlock,
  keysForUnlock,
} from './content';
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
  /** Submit an answer for any activity; returns whether it was correct. */
  answer(payload: AnswerPayload): boolean;
  choose(value: number): void;
  tapAnimal(): void;
  replay(): void;
  back(): void; // → home
  openStickers(): void;
  closeOverlay(): void;
  /** Count-Along: speak the running tally as the child taps the nth friend (§5.1). */
  countSpeak(n: number): void;
  gateDown(): void;
  gateUp(): void;
  closeSettings(): void;
  setName(name: string): void;
  toggleReduceMotion(): void;
  toggleVoice(): void;
  toggleArithmetic(): void;
}

function makeV2Defaults(startLevel: number): V2Defaults {
  const unlocks = defaultUnlocks();
  const mastery: Record<string, MasteryRecord> = {};
  // Count inherits the migrated starting level; the new skills start fresh at 1
  // (the adaptive engine moves them up quickly if he's ready).
  for (const id of unlocks.activities) {
    mastery[id] = { level: id === 'count' ? startLevel : 1, window: [] };
  }
  return { stars: 0, streakBest: 0, mastery, unlocks, settings: {} };
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
  streakBest: number;
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

  /** Personal-best streak (persisted on a new best). Declared before the reducer
   *  initializer, which seeds it from stored v2 state. */
  const streakBestRef = useRef(0);

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
    streakBestRef.current = v2.streakBest;
    return initialState(prefs, {
      mastery: v2.mastery,
      stars: v2.stars,
      unlocks: v2.unlocks,
      settings: v2.settings,
      activityId: 'count',
    });
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revertRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reaskRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const clearReveal = useCallback(() => {
    if (revealRef.current !== null) {
      clearTimeout(revealRef.current);
      revealRef.current = null;
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
    clearReveal();
  }, [clearIdle, clearAdvance, clearRevert, clearReask, clearReveal]);

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
      // Only unlocked collectibles appear in rotation (§7.7).
      const pool = unlockedCharacters(stateRef.current.unlocks);
      const round = activity.generate(levelFor(activityId), rngRef.current, pool);
      dispatch({ type: 'DEAL_ROUND', round, activityId });
      firstAttemptRef.current = true;
      audioRef.current.speak(
        activity.prompt(round, stateRef.current.childName || undefined).speech,
      );
      // Quick Look: reveal the friends, then hide after revealMs (engine timer
      // so it is fake-timer-able in tests, §5.4).
      clearReveal();
      if (round.kind === 'quicklook') {
        revealRef.current = setTimeout(() => {
          revealRef.current = null;
          dispatch({ type: 'SET_REVEAL_PHASE', phase: 'hidden' });
        }, round.revealMs);
      }
      startIdle();
    },
    [levelFor, startIdle, clearReveal],
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
  const recordOutcome = useCallback(
    (activityId: ActivityId, correct: boolean): { newStreak: number; leveledUp: boolean } => {
      const s = stateRef.current;
      const newStreak = correct ? s.streak + 1 : 0;
      dispatch({ type: 'SET_STREAK', streak: newStreak });

      const prev = s.mastery[activityId] ?? { level: 1, window: [] };
      const window = applyAttempt(prev.window, correct);
      const since = sinceChangeRef.current[activityId] ?? Infinity;
      const { level, leveledUp } = nextLevel(prev.level, window, newStreak, since);
      sinceChangeRef.current[activityId] = level === prev.level ? since + 1 : 0;

      dispatch({ type: 'SET_MASTERY', activityId, level, window });
      const nextMastery = { ...s.mastery, [activityId]: { level, window } };
      saveMastery(nextMastery);
      return { newStreak, leveledUp };
    },
    [],
  );

  /**
   * Award stars + run the celebration arbiter (§7.6): at most ONE big overlay
   * per answer (unlock > level-up > streak); the rest fall through to ordinary
   * praise. Stars are monotonic and persisted. Called only on a round-complete.
   */
  const handleReward = useCallback(
    (activityId: ActivityId, streak: number, leveledUp: boolean) => {
      const s = stateRef.current;
      const milestone = isStreakMilestone(streak);
      const prevStars = s.stars;
      const newStars = prevStars + starsForRound({ milestone, leveledUp });
      dispatch({ type: 'AWARD_STARS', stars: newStars });
      saveStars(newStars);
      if (streak > streakBestRef.current) {
        streakBestRef.current = streak;
        saveStreakBest(streak);
      }

      // 1) Unlock crossing wins the overlay.
      const unlocked = newlyUnlocked(prevStars, newStars);
      if (unlocked.length > 0) {
        let u = s.unlocks;
        for (const unlock of unlocked) u = applyUnlock(u, unlock);
        dispatch({ type: 'SET_UNLOCKS', unlocks: u });
        saveUnlocks(u);
        const key = keysForUnlock(unlocked[0])[0];
        dispatch({ type: 'SHOW_OVERLAY', overlay: { kind: 'unlock', characterKey: key } });
        const friendName = key ? getCharacter(key as never).name : 'a new friend';
        audioRef.current.speak(`You found a new friend! Say hello to ${friendName}!`);
        return;
      }

      // 2) Streak milestone — the name-bearing callout banner.
      if (milestone) {
        const line = streakCallout(streak, activityId, s.childName || undefined);
        dispatch({ type: 'SHOW_OVERLAY', overlay: { kind: 'celebrate', line } });
        audioRef.current.speak(line);
        return;
      }

      // 3) Quiet level-up.
      if (leveledUp) {
        const name = s.childName ? `Great job, ${s.childName}! ` : '';
        const line = `${name}Let's try something a little bigger!`;
        dispatch({ type: 'SHOW_OVERLAY', overlay: { kind: 'celebrate', line } });
        audioRef.current.speak(line);
        return;
      }

      // 4) Ordinary clean answer — the usual praise.
      audioRef.current.speak(
        praiseLine(
          s.count,
          PRAISE[Math.floor(rngRef.current() * PRAISE.length)],
          s.childName || undefined,
        ),
      );
    },
    [],
  );

  /** Celebrate a completed round and arm the auto-advance. */
  const completeRound = useCallback(
    (wasFirst: boolean, streak: number, leveledUp: boolean) => {
      const s = stateRef.current;
      audioRef.current.playPop();
      handleReward(s.activityId, wasFirst ? streak : s.streak, wasFirst && leveledUp);
      const delay = s.reduceMotion ? TIMING.advanceReduceMotion : TIMING.advance;
      clearAdvance();
      advanceRef.current = setTimeout(() => {
        advanceRef.current = null;
        dealRound(stateRef.current.activityId);
      }, delay);
    },
    [clearAdvance, dealRound, handleReward],
  );

  /**
   * Submit an answer for ANY activity. Single-tap activities follow the v1
   * no-fail loop; Match Up is multi-step (links accumulate) and its wrong
   * connects are a SILENT non-event (§5.3). Returns whether the payload was
   * correct (Match Up's component uses this to wobble locally on a miss).
   */
  const answer = useCallback(
    (payload: AnswerPayload): boolean => {
      const s = stateRef.current;
      if (s.status !== 'asking' || !s.round) return false; // rapid-tap guard
      audioRef.current.ensureAudio();
      const activity = getActivity(s.activityId);
      const { correct, roundComplete } = activity.evaluate(s.round, payload);

      // ---- Match Up: multi-step, no-fail-silent wrong connects ----
      if (s.round.kind === 'match') {
        if (correct && payload.kind === 'pair') {
          clearIdle();
          audioRef.current.playChirp(); // soft link-chime
          const total = Object.keys(s.round.solution).length;
          const linkedCount = (s.matchProgress?.linked.length ?? 0) + 1;
          dispatch({ type: 'LINK_PAIR', leftId: payload.leftId, rightId: payload.rightId });
          if (linkedCount >= total) {
            const wasFirst = firstAttemptRef.current;
            let streak = s.streak;
            let leveledUp = false;
            if (wasFirst) {
              firstAttemptRef.current = false;
              ({ newStreak: streak, leveledUp } = recordOutcome(s.activityId, true));
            }
            dispatch({ type: 'MATCH_COMPLETE' });
            completeRound(wasFirst, streak, leveledUp);
          }
        }
        // A wrong connect: no audio, no streak reset — the component wobbles.
        return correct;
      }

      // ---- Sequence (Order "build" mode): multi-step, no-fail ----
      if (payload.kind === 'sequence') {
        if (correct && roundComplete) {
          clearIdle();
          const wasFirst = firstAttemptRef.current;
          let streak = s.streak;
          let leveledUp = false;
          if (wasFirst) {
            firstAttemptRef.current = false;
            ({ newStreak: streak, leveledUp } = recordOutcome(s.activityId, true));
          }
          dispatch({ type: 'MATCH_COMPLETE' }); // sets status correct for the celebration
          completeRound(wasFirst, streak, leveledUp);
        } else if (correct) {
          audioRef.current.playChirp(); // soft tick on a valid partial sequence
        } else {
          audioRef.current.playWhoops(); // gentle; no advance, no streak reset
        }
        return correct;
      }

      // ---- Single-tap activities (count, numeral, quicklook, …) ----
      clearIdle();
      const value = payload.kind === 'tile' ? payload.value : 0;
      dispatch({ type: 'CHOOSE', value, correct });

      const wasFirst = firstAttemptRef.current;
      let streak = s.streak;
      let leveledUp = false;
      if (wasFirst) {
        firstAttemptRef.current = false;
        ({ newStreak: streak, leveledUp } = recordOutcome(s.activityId, correct));
      }

      if (correct && roundComplete) {
        completeRound(wasFirst, streak, leveledUp);
      } else if (!correct) {
        audioRef.current.playWhoops();
        clearRevert();
        revertRef.current = setTimeout(() => {
          revertRef.current = null;
          dispatch({ type: 'CLEAR_ANIM' });
        }, TIMING.wrongRevert);
        // Count It remediation (§5.1): the first wrong count answer offers
        // "count along" — tap each friend, count together — instead of a bare
        // re-ask. Off by default; only ever surfaced here, never forced.
        if (s.activityId === 'count' && !s.countAlong) {
          dispatch({ type: 'SET_COUNT_ALONG', on: true });
          clearReask();
          reaskRef.current = setTimeout(() => {
            reaskRef.current = null;
            audioRef.current.speak("Let's count them together!");
          }, TIMING.reask);
        } else {
          clearReask();
          reaskRef.current = setTimeout(() => {
            reaskRef.current = null;
            if (stateRef.current.status === 'asking') speakPrompt();
          }, TIMING.reask);
        }
        // Note: do NOT re-arm idle on a wrong answer (matches v1).
      }
      return correct;
    },
    [clearIdle, clearRevert, clearReask, recordOutcome, completeRound, speakPrompt],
  );

  const choose = useCallback(
    (value: number) => {
      answer({ kind: 'tile', value });
    },
    [answer],
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

  const openStickers = useCallback(() => {
    audioRef.current.ensureAudio();
    dispatch({ type: 'OPEN_STICKERS' });
  }, []);

  const closeOverlay = useCallback(() => {
    dispatch({ type: 'CLOSE_OVERLAY' });
  }, []);

  const countSpeak = useCallback((n: number) => {
    audioRef.current.ensureAudio();
    audioRef.current.playChirp(); // soft per-friend tick
    audioRef.current.speak(WORDS[n] ?? String(n)); // "one", "two", "three", …
  }, []);

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

  const toggleArithmetic = useCallback(() => {
    const next = { ...stateRef.current.settings, arithmetic: !stateRef.current.settings.arithmetic };
    dispatch({ type: 'SET_SETTINGS', settings: next });
    saveSettings(next);
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
      answer,
      choose,
      tapAnimal,
      replay,
      back,
      openStickers,
      closeOverlay,
      countSpeak,
      gateDown,
      gateUp,
      closeSettings,
      setName,
      toggleReduceMotion,
      toggleVoice,
      toggleArithmetic,
    }),
    [
      enterActivity,
      answer,
      choose,
      tapAnimal,
      replay,
      back,
      openStickers,
      closeOverlay,
      countSpeak,
      gateDown,
      gateUp,
      closeSettings,
      setName,
      toggleReduceMotion,
      toggleVoice,
      toggleArithmetic,
    ],
  );

  // Expose the registry-backed available activities for the Home Board.
  void ACTIVITIES;

  return { state, actions, streakBest: streakBestRef.current };
}
