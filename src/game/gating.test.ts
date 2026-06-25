import { describe, it, expect } from 'vitest';
import type { MasteryRecord } from './persistence';
import { defaultUnlocks } from './content';
import { availableActivities, arithmeticUnlocked } from './gating';

const lowMastery: Record<string, MasteryRecord> = {
  count: { level: 1, window: [] },
};
const highMastery: Record<string, MasteryRecord> = {
  count: { level: 4, window: [] },
  numeral: { level: 3, window: [] },
  match: { level: 2, window: [] },
};

describe('arithmeticUnlocked', () => {
  it('keeps arithmetic hidden by default (low mastery, toggle off)', () => {
    expect(arithmeticUnlocked(lowMastery, {})).toEqual({ onemore: false, add: false });
  });

  it('the settings toggle reveals both arithmetic activities immediately', () => {
    expect(arithmeticUnlocked(lowMastery, { arithmetic: true })).toEqual({
      onemore: true,
      add: true,
    });
  });

  it('the mastery bar unlocks One More automatically; Add waits for One More mastery', () => {
    expect(arithmeticUnlocked(highMastery, {})).toEqual({ onemore: true, add: false });
    const withOnemore = { ...highMastery, onemore: { level: 2, window: [] } };
    expect(arithmeticUnlocked(withOnemore, {})).toEqual({ onemore: true, add: true });
  });
});

describe('availableActivities', () => {
  it('offers the number-sense + ordering activities and hides arithmetic by default', () => {
    const got = availableActivities(defaultUnlocks(), lowMastery, {});
    expect(got).toEqual(['count', 'numeral', 'quicklook', 'match', 'compare', 'order']);
    expect(got).not.toContain('onemore');
    expect(got).not.toContain('add');
  });

  it('appends arithmetic when the toggle is on', () => {
    const got = availableActivities(defaultUnlocks(), lowMastery, { arithmetic: true });
    expect(got).toContain('onemore');
    expect(got).toContain('add');
  });

  it('only returns registered activities', () => {
    const weird = { ...defaultUnlocks(), activities: ['count', 'bogus'] };
    expect(availableActivities(weird, lowMastery, {})).toEqual(['count']);
  });
});
