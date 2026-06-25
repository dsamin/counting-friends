import { describe, it, expect } from 'vitest';
import { PROGRESSION, applyAttempt, nextLevel } from './progression';

/**
 * Tests assert RELATIVE to the PROGRESSION constants (never bare literals), so
 * re-tuning the frozen constants never breaks a test. See FINAL spec §6.1/§6.2.
 */

/** Build a boolean[] with `trueCount` trues followed by `falseCount` falses. */
function makeWindow(trueCount: number, falseCount: number): boolean[] {
  return [
    ...Array<boolean>(trueCount).fill(true),
    ...Array<boolean>(falseCount).fill(false),
  ];
}

describe('applyAttempt', () => {
  it('appends a new outcome to a non-full window', () => {
    const input = [true, false];
    const out = applyAttempt(input, true);
    expect(out).toEqual([true, false, true]);
  });

  it('never exceeds PROGRESSION.window in length', () => {
    let win: boolean[] = [];
    for (let i = 0; i < PROGRESSION.window + 5; i++) {
      win = applyAttempt(win, true);
      expect(win.length).toBeLessThanOrEqual(PROGRESSION.window);
    }
    expect(win.length).toBe(PROGRESSION.window);
  });

  it('drops the OLDEST entry when full', () => {
    // Fill the window with `false`, oldest-first, then push a `true`.
    const full = Array<boolean>(PROGRESSION.window).fill(false);
    full[0] = false; // oldest
    const marked = [...full];
    marked[0] = false;
    // Make the oldest distinguishable: oldest=true, rest=false.
    const distinguishable = Array<boolean>(PROGRESSION.window).fill(false);
    distinguishable[0] = true; // this is the oldest and should be dropped
    const out = applyAttempt(distinguishable, true);
    expect(out.length).toBe(PROGRESSION.window);
    // The dropped oldest `true` is gone; the new `true` is at the end.
    expect(out[out.length - 1]).toBe(true);
    // Everything before the last is false (the original trailing falses), proving
    // the leading `true` was dropped.
    expect(out.slice(0, out.length - 1).every((v) => v === false)).toBe(true);
  });

  it('does not mutate the input array (returns a new array)', () => {
    const input = [true, false, true];
    const snapshot = [...input];
    const out = applyAttempt(input, false);
    expect(input).toEqual(snapshot); // input untouched
    expect(out).not.toBe(input); // new reference
  });
});

describe('nextLevel', () => {
  const ready = PROGRESSION.cooldownRounds; // roundsSinceChange that clears cooldown

  it('cooldown blocks any change even with a perfect window', () => {
    const perfect = makeWindow(PROGRESSION.window, 0);
    const res = nextLevel(2, perfect, PROGRESSION.levelUp.cleanStreak, PROGRESSION.cooldownRounds - 1);
    expect(res).toEqual({ level: 2, leveledUp: false });
  });

  it('fast first climb from L1 after PROGRESSION.fastFirstClimb correct', () => {
    // Exactly fastFirstClimb trues anywhere in the window, below the normal minCorrect gate.
    const win = makeWindow(PROGRESSION.fastFirstClimb, 0);
    expect(PROGRESSION.fastFirstClimb).toBeLessThan(PROGRESSION.levelUp.minCorrect);
    const res = nextLevel(1, win, 0, ready);
    expect(res).toEqual({ level: 2, leveledUp: true });
  });

  it('does NOT fast-climb from L1 with fewer than PROGRESSION.fastFirstClimb correct', () => {
    const win = makeWindow(PROGRESSION.fastFirstClimb - 1, 0);
    const res = nextLevel(1, win, 0, ready);
    expect(res).toEqual({ level: 1, leveledUp: false });
  });

  it('window-based level-up at minCorrect of ofLast', () => {
    // minCorrect trues + the rest false, within the last `ofLast` entries.
    const falses = PROGRESSION.levelUp.ofLast - PROGRESSION.levelUp.minCorrect;
    const win = makeWindow(PROGRESSION.levelUp.minCorrect, falses);
    const res = nextLevel(3, win, 0, ready);
    expect(res).toEqual({ level: 4, leveledUp: true });
  });

  it('no window-based level-up just below minCorrect', () => {
    const trues = PROGRESSION.levelUp.minCorrect - 1;
    const falses = PROGRESSION.levelUp.ofLast - trues;
    const win = makeWindow(trues, falses);
    // streak below cleanStreak too, so neither gate fires.
    const res = nextLevel(3, win, PROGRESSION.levelUp.cleanStreak - 1, ready);
    expect(res).toEqual({ level: 3, leveledUp: false });
  });

  it('clean-streak level-up at PROGRESSION.levelUp.cleanStreak', () => {
    // Sparse window (would not satisfy minCorrect) but streak hits the gate.
    const win = makeWindow(1, PROGRESSION.window - 1);
    const res = nextLevel(4, win, PROGRESSION.levelUp.cleanStreak, ready);
    expect(res).toEqual({ level: 5, leveledUp: true });
  });

  it('never exceeds PROGRESSION.maxLevel', () => {
    const perfect = makeWindow(PROGRESSION.window, 0);
    const res = nextLevel(PROGRESSION.maxLevel, perfect, PROGRESSION.levelUp.cleanStreak, ready);
    expect(res).toEqual({ level: PROGRESSION.maxLevel, leveledUp: false });
  });

  it('eases back when recent correct <= easeBack.maxCorrect, silently', () => {
    // maxCorrect trues in the most-recent ofLast → ease back.
    const trues = PROGRESSION.easeBack.maxCorrect;
    const falses = PROGRESSION.easeBack.ofLast - trues;
    const win = makeWindow(trues, falses);
    const res = nextLevel(3, win, 0, ready);
    expect(res).toEqual({ level: 2, leveledUp: false });
  });

  it('ease-back never drops below level 1', () => {
    const trues = PROGRESSION.easeBack.maxCorrect;
    const falses = PROGRESSION.easeBack.ofLast - trues;
    const win = makeWindow(trues, falses);
    const res = nextLevel(1, win, 0, ready);
    // current === 1, so ease-back guard (current > 1) prevents any change.
    expect(res).toEqual({ level: 1, leveledUp: false });
  });

  it('does NOT ease back before window.length >= easeBack.ofLast', () => {
    // Window shorter than ofLast, all failures — still no ease-back (not enough data).
    const win = makeWindow(0, PROGRESSION.easeBack.ofLast - 1);
    const res = nextLevel(3, win, 0, ready);
    expect(res).toEqual({ level: 3, leveledUp: false });
  });

  it('does NOT ease back just above easeBack.maxCorrect', () => {
    const trues = PROGRESSION.easeBack.maxCorrect + 1;
    const falses = PROGRESSION.easeBack.ofLast - trues;
    const win = makeWindow(trues, falses);
    const res = nextLevel(3, win, 0, ready);
    expect(res).toEqual({ level: 3, leveledUp: false });
  });

  it('a steady alternating state produces no change', () => {
    // Alternating true/false over a full window: half correct — between the
    // ease-back floor and the level-up gate. Streak is 0.
    const win: boolean[] = [];
    for (let i = 0; i < PROGRESSION.window; i++) win.push(i % 2 === 0);
    const res = nextLevel(3, win, 0, ready);
    expect(res).toEqual({ level: 3, leveledUp: false });
  });
});
