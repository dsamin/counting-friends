import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AudioEngine } from './audio';
import type { Rng } from './types';
import { TIMING, PRAISE } from './constants';
import { PROGRESSION } from './progression';
import { useGame } from './useGame';

/** A mock AudioEngine that records every call. */
function makeAudio(): AudioEngine & {
  calls: { speak: string[]; pop: number; whoops: number; chirp: number; cancel: number; ensure: number };
} {
  const calls = { speak: [] as string[], pop: 0, whoops: 0, chirp: 0, cancel: 0, ensure: 0 };
  return {
    calls,
    ensureAudio() {
      calls.ensure++;
    },
    speak(text: string) {
      calls.speak.push(text);
    },
    playPop() {
      calls.pop++;
    },
    playWhoops() {
      calls.whoops++;
    },
    playChirp() {
      calls.chirp++;
    },
    cancelSpeech() {
      calls.cancel++;
    },
  };
}

/**
 * Deterministic RNG: cycles a fixed list. count.generate consumes rng() for
 * the count, then the animal, then the distractor choices (then a shuffle).
 * A stable, varied sequence keeps the dealt round well-formed.
 */
function seqRng(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

/**
 * Under fake timers jsdom's requestAnimationFrame still fires (it's
 * timer-backed) but performance.now() barely advances, so the gate RAF loop
 * never reaches p>=1. Stub performance.now with a clock we control so the
 * long-press gate can complete deterministically.
 */
function stubClock() {
  let t = 0;
  const spy = vi.spyOn(performance, 'now').mockImplementation(() => t);
  return {
    advance(ms: number) {
      t += ms;
    },
    restore() {
      spy.mockRestore();
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  // Flush any pending advance/idle timers inside act so trailing reducer
  // updates don't trip React's "not wrapped in act(...)" warning.
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

function setup(rngValues = [0.2, 0.6, 0.4, 0.8, 0.1, 0.9, 0.3, 0.7]) {
  const audio = makeAudio();
  const rng = seqRng(rngValues);
  const view = renderHook(() =>
    useGame({ audio, rng, defaultTier: 'easy', voiceEnabled: true }),
  );
  return { audio, view };
}

describe('enter activity → deal first round', () => {
  it('moves to play, deals a round in range, speaks the prompt once', () => {
    const { audio, view } = setup();
    act(() => {
      view.result.current.actions.enterActivity('count');
    });
    const s = view.result.current.state;
    expect(s.screen).toBe('play');
    expect(s.activityId).toBe('count');
    expect(s.count).toBeGreaterThanOrEqual(1);
    expect(s.count).toBeLessThanOrEqual(5);
    expect(s.choices.length).toBe(3);
    expect(s.choices).toContain(s.count);
    expect(s.roundId).toBe(1);
    expect(audio.calls.ensure).toBeGreaterThanOrEqual(1);
    // exactly one prompt spoken for the freshly dealt round
    expect(audio.calls.speak.filter((t) => t.startsWith('How many')).length).toBe(1);
  });
});

describe('adaptive progression', () => {
  it('raises the activity level after a clean run (fast first climb)', () => {
    const { view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    for (let i = 0; i < PROGRESSION.fastFirstClimb; i += 1) {
      const count = view.result.current.state.count;
      act(() => view.result.current.actions.choose(count));
      act(() => vi.advanceTimersByTime(TIMING.advance));
    }
    expect(view.result.current.state.mastery.count.level).toBeGreaterThan(1);
  });

  it('increments streak on a clean answer and resets it on a wrong first attempt', () => {
    const { view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));

    const count = view.result.current.state.count;
    act(() => view.result.current.actions.choose(count));
    expect(view.result.current.state.streak).toBe(1);
    act(() => vi.advanceTimersByTime(TIMING.advance));

    const next = view.result.current.state.count;
    const wrong = view.result.current.state.choices.find((c) => c !== next)!;
    act(() => view.result.current.actions.choose(wrong));
    expect(view.result.current.state.streak).toBe(0);
  });
});

describe('rewards', () => {
  it('a 3-in-a-row streak speaks a name-bearing callout and shows a celebrate banner', () => {
    const { audio, view } = setup();
    act(() => view.result.current.actions.setName('Jayden'));
    act(() => view.result.current.actions.enterActivity('count'));
    for (let i = 0; i < 3; i += 1) {
      const count = view.result.current.state.count;
      act(() => view.result.current.actions.choose(count));
      if (i < 2) act(() => vi.advanceTimersByTime(TIMING.advance));
    }
    const overlay = view.result.current.state.overlay;
    expect(overlay?.kind).toBe('celebrate');
    expect(overlay?.kind === 'celebrate' && overlay.line).toContain('Jayden');
    expect(
      audio.calls.speak.some((t) => t.includes('Jayden') && /in a row/i.test(t)),
    ).toBe(true);
  });

  it('stars never decrease across a wrong-then-right sequence (no-fail guard)', () => {
    const { view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));

    const count = view.result.current.state.count;
    act(() => view.result.current.actions.choose(count));
    const afterFirst = view.result.current.state.stars;
    expect(afterFirst).toBeGreaterThanOrEqual(1);
    act(() => vi.advanceTimersByTime(TIMING.advance));

    const next = view.result.current.state.count;
    const wrong = view.result.current.state.choices.find((c) => c !== next)!;
    act(() => view.result.current.actions.choose(wrong));
    expect(view.result.current.state.stars).toBeGreaterThanOrEqual(afterFirst);
    // correcting the same round still never lowers stars
    act(() => view.result.current.actions.choose(next));
    expect(view.result.current.state.stars).toBeGreaterThanOrEqual(afterFirst);
  });

  it('a wrong Count It answer offers Count-Along remediation, off by default (§5.1)', () => {
    const { view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    expect(view.result.current.state.countAlong).toBe(false);
    const count = view.result.current.state.count;
    const wrong = view.result.current.state.choices.find((c) => c !== count)!;
    act(() => view.result.current.actions.choose(wrong));
    expect(view.result.current.state.countAlong).toBe(true);
  });

  it('a wrong Match Up connect is SILENT and does not reset the streak (§14.4 no-fail guard)', () => {
    const { audio, view } = setup();
    // Build a non-zero streak with a clean count answer.
    act(() => view.result.current.actions.enterActivity('count'));
    const count = view.result.current.state.count;
    act(() => view.result.current.actions.choose(count));
    act(() => vi.advanceTimersByTime(TIMING.advance));
    // Enter Match Up — the streak carries over.
    act(() => view.result.current.actions.enterActivity('match'));
    const round = view.result.current.state.round;
    expect(round?.kind).toBe('match');
    if (round?.kind !== 'match') throw new Error('expected a match round');

    const streakBefore = view.result.current.state.streak;
    expect(streakBefore).toBeGreaterThan(0);
    const whoopsBefore = audio.calls.whoops;
    const chirpBefore = audio.calls.chirp;

    // Craft a deliberately WRONG pair (a right id that is not the left's solution).
    const left = round.left[0];
    const wrongRight = round.right.find((r) => round.solution[left.id] !== r.id)!;
    let returned: boolean | undefined;
    act(() => {
      returned = view.result.current.actions.answer({
        kind: 'pair',
        leftId: left.id,
        rightId: wrongRight.id,
      });
    });

    expect(returned).toBe(false);
    // No punishing sound, no link recorded, streak untouched.
    expect(audio.calls.whoops).toBe(whoopsBefore);
    expect(audio.calls.chirp).toBe(chirpBefore);
    expect(view.result.current.state.matchProgress?.linked ?? []).toHaveLength(0);
    expect(view.result.current.state.streak).toBe(streakBefore);
  });

  it('crossing a star threshold records the unlock and shows the unlock reveal', () => {
    const { view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    let unlocked = false;
    for (let i = 0; i < 40 && !unlocked; i += 1) {
      const count = view.result.current.state.count;
      act(() => view.result.current.actions.choose(count));
      if (view.result.current.state.overlay?.kind === 'unlock') {
        unlocked = true;
      } else {
        act(() => vi.advanceTimersByTime(TIMING.advance));
      }
    }
    expect(unlocked).toBe(true);
    const stored = JSON.parse(localStorage.getItem('cf_unlocks') || '{}');
    expect(stored.friends).toContain('dog');
  });
});

describe('choose correct', () => {
  it('plays pop, speaks praise, and auto-advances at TIMING.advance', () => {
    const { audio, view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    const count = view.result.current.state.count;
    const roundId = view.result.current.state.roundId;

    act(() => view.result.current.actions.choose(count));
    expect(audio.calls.pop).toBe(1);
    expect(view.result.current.state.status).toBe('correct');
    // a praise line was spoken (one of the PRAISE phrases appears)
    const spokePraise = audio.calls.speak.some((t) =>
      PRAISE.some((p) => t.includes(p)),
    );
    expect(spokePraise).toBe(true);

    // not yet advanced just before the timer
    act(() => vi.advanceTimersByTime(TIMING.advance - 1));
    expect(view.result.current.state.roundId).toBe(roundId);

    act(() => vi.advanceTimersByTime(1));
    expect(view.result.current.state.roundId).toBe(roundId + 1);
    expect(view.result.current.state.status).toBe('asking');
  });

  it('advances at advanceReduceMotion when reduceMotion is on', () => {
    const audio = makeAudio();
    const rng = seqRng([0.2, 0.6, 0.4, 0.8, 0.1, 0.9]);
    const view = renderHook(() =>
      useGame({ audio, rng, defaultTier: 'easy', voiceEnabled: true }),
    );
    act(() => view.result.current.actions.enterActivity('count'));
    act(() => view.result.current.actions.toggleReduceMotion());
    expect(view.result.current.state.reduceMotion).toBe(true);

    const count = view.result.current.state.count;
    const roundId = view.result.current.state.roundId;
    act(() => view.result.current.actions.choose(count));

    act(() => vi.advanceTimersByTime(TIMING.advanceReduceMotion - 1));
    expect(view.result.current.state.roundId).toBe(roundId);
    act(() => vi.advanceTimersByTime(1));
    expect(view.result.current.state.roundId).toBe(roundId + 1);
  });
});

describe('choose wrong', () => {
  it('plays whoops, keeps asking, reverts at 640ms, offers Count-Along at 760ms, no advance', () => {
    const { audio, view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    const count = view.result.current.state.count;
    const roundId = view.result.current.state.roundId;
    // pick a wrong value guaranteed different from count
    const wrong = view.result.current.state.choices.find((c) => c !== count)!;

    act(() => view.result.current.actions.choose(wrong));
    expect(audio.calls.whoops).toBe(1);
    expect(view.result.current.state.status).toBe('asking');
    expect(view.result.current.state.animatingValue).toBe(wrong);

    // wrong-revert clears the anim at 640ms
    act(() => vi.advanceTimersByTime(TIMING.wrongRevert));
    expect(view.result.current.state.animatingValue).toBeNull();

    // For Count It, the wrong answer offers Count-Along (§5.1): the invitation
    // is spoken at 760ms and count-along mode is active (no bare prompt re-ask).
    act(() => vi.advanceTimersByTime(TIMING.reask - TIMING.wrongRevert));
    expect(view.result.current.state.countAlong).toBe(true);
    expect(audio.calls.speak.some((t) => /count them together/i.test(t))).toBe(
      true,
    );

    // no auto-advance for a wrong answer
    act(() => vi.advanceTimersByTime(TIMING.advance));
    expect(view.result.current.state.roundId).toBe(roundId);
  });
});

describe('rapid-tap guard', () => {
  it('ignores choose() once a correct answer is locked in', () => {
    const { audio, view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    const count = view.result.current.state.count;
    act(() => view.result.current.actions.choose(count));
    const popAfterFirst = audio.calls.pop;
    const whoopsAfterFirst = audio.calls.whoops;

    // hammer it: nothing should change
    act(() => {
      view.result.current.actions.choose(count);
      view.result.current.actions.choose(count + 1);
    });
    expect(audio.calls.pop).toBe(popAfterFirst);
    expect(audio.calls.whoops).toBe(whoopsAfterFirst);
    expect(view.result.current.state.status).toBe('correct');
  });
});

describe('idle re-prompt', () => {
  it('re-asks after 6s of inactivity and re-arms itself', () => {
    const { audio, view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    const base = audio.calls.speak.filter((t) => t.startsWith('How many')).length;

    act(() => vi.advanceTimersByTime(TIMING.idle));
    expect(
      audio.calls.speak.filter((t) => t.startsWith('How many')).length,
    ).toBe(base + 1);

    // self-rearms — fires again after another idle window
    act(() => vi.advanceTimersByTime(TIMING.idle));
    expect(
      audio.calls.speak.filter((t) => t.startsWith('How many')).length,
    ).toBe(base + 2);
  });

  it('does not idle-prompt while settings are open', () => {
    // Drive the gate to completion with a controllable performance.now clock,
    // opening settings; then confirm idle stays silent.
    const clock = stubClock();
    const { audio, view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));

    act(() => view.result.current.actions.gateDown());
    // advance clock past gateHold and pump RAF callbacks
    act(() => {
      clock.advance(TIMING.gateHold + 50);
      vi.advanceTimersByTime(50); // jsdom RAF is timer-backed
    });
    expect(view.result.current.state.settingsOpen).toBe(true);

    const base = audio.calls.speak.filter((t) => t.startsWith('How many')).length;
    act(() => vi.advanceTimersByTime(TIMING.idle));
    expect(
      audio.calls.speak.filter((t) => t.startsWith('How many')).length,
    ).toBe(base);
    clock.restore();
  });
});

describe('settings gate (long-press)', () => {
  it('gateDown advances progress and opens settings when held past gateHold', () => {
    const clock = stubClock();
    const { view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));

    act(() => view.result.current.actions.gateDown());
    act(() => {
      clock.advance(TIMING.gateHold / 2);
      vi.advanceTimersByTime(20);
    });
    expect(view.result.current.state.gateProgress).toBeGreaterThan(0);
    expect(view.result.current.state.gateProgress).toBeLessThan(1);
    expect(view.result.current.state.settingsOpen).toBe(false);

    act(() => {
      clock.advance(TIMING.gateHold);
      vi.advanceTimersByTime(20);
    });
    expect(view.result.current.state.settingsOpen).toBe(true);
    expect(view.result.current.state.gateProgress).toBe(0);
    clock.restore();
  });

  it('gateUp before completion resets progress to 0', () => {
    const clock = stubClock();
    const { view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));

    act(() => view.result.current.actions.gateDown());
    act(() => {
      clock.advance(TIMING.gateHold / 3);
      vi.advanceTimersByTime(20);
    });
    expect(view.result.current.state.gateProgress).toBeGreaterThan(0);

    act(() => view.result.current.actions.gateUp());
    expect(view.result.current.state.gateProgress).toBe(0);
    expect(view.result.current.state.settingsOpen).toBe(false);
    clock.restore();
  });
});

describe('tapAnimal / replay', () => {
  it('tapAnimal chirps and speaks the animal sound', () => {
    const { audio, view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    const sound = view.result.current.state.animal.sound;
    const chirpBefore = audio.calls.chirp;
    act(() => view.result.current.actions.tapAnimal());
    expect(audio.calls.chirp).toBe(chirpBefore + 1);
    expect(audio.calls.speak).toContain(sound);
  });

  it('replay speaks the current prompt', () => {
    const { audio, view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    const animal = view.result.current.state.animal;
    const before = audio.calls.speak.length;
    act(() => view.result.current.actions.replay());
    expect(audio.calls.speak[before]).toBe(`How many ${animal.plural}?`);
  });
});

describe('back', () => {
  it('clears timers, cancels speech, returns to start', () => {
    const { audio, view } = setup();
    act(() => view.result.current.actions.enterActivity('count'));
    const count = view.result.current.state.count;
    const roundId = view.result.current.state.roundId;
    act(() => view.result.current.actions.choose(count)); // arms advance timer

    act(() => view.result.current.actions.back());
    expect(view.result.current.state.screen).toBe('home');
    expect(audio.calls.cancel).toBeGreaterThanOrEqual(1);

    // advance timer must NOT fire a new round after back()
    act(() => vi.advanceTimersByTime(TIMING.advance + TIMING.idle));
    expect(view.result.current.state.roundId).toBe(roundId);
  });
});

describe('settings persistence', () => {
  it('toggleVoice off cancels speech and persists', () => {
    const { audio, view } = setup();
    const cancelBefore = audio.calls.cancel;
    act(() => view.result.current.actions.toggleVoice());
    expect(view.result.current.state.voiceOn).toBe(false);
    expect(audio.calls.cancel).toBe(cancelBefore + 1);
    expect(localStorage.getItem('cf_voice')).toBe('0');
  });

  it('setName persists the child name', () => {
    const { view } = setup();
    act(() => view.result.current.actions.setName('Mia'));
    expect(view.result.current.state.childName).toBe('Mia');
    expect(localStorage.getItem('cf_name')).toBe('Mia');
  });

  it('toggleReduceMotion persists', () => {
    const { view } = setup();
    act(() => view.result.current.actions.toggleReduceMotion());
    expect(view.result.current.state.reduceMotion).toBe(true);
    expect(localStorage.getItem('cf_rm')).toBe('1');
  });
});
