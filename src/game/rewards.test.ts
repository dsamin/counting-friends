import { describe, it, expect } from 'vitest';
import { REWARDS, starsForRound, isStreakMilestone, streakCallout } from './rewards';
import type { ActivityId } from './activities/types';

describe('starsForRound', () => {
  it('awards the per-round base when nothing special happened', () => {
    expect(starsForRound({})).toBe(REWARDS.starsPerRound);
  });

  it('adds the milestone bonus when a milestone is hit', () => {
    expect(starsForRound({ milestone: true })).toBe(
      REWARDS.starsPerRound + REWARDS.milestoneBonus,
    );
  });

  it('adds the level-up bonus when the child leveled up', () => {
    expect(starsForRound({ leveledUp: true })).toBe(
      REWARDS.starsPerRound + REWARDS.levelUpBonus,
    );
  });

  it('stacks both bonuses when milestone and level-up coincide', () => {
    expect(starsForRound({ milestone: true, leveledUp: true })).toBe(
      REWARDS.starsPerRound + REWARDS.milestoneBonus + REWARDS.levelUpBonus,
    );
  });

  it('treats explicit false the same as omission', () => {
    expect(starsForRound({ milestone: false, leveledUp: false })).toBe(
      REWARDS.starsPerRound,
    );
  });
});

describe('isStreakMilestone', () => {
  it('is true for each configured streak milestone', () => {
    for (const m of REWARDS.streakMilestones) {
      expect(isStreakMilestone(m)).toBe(true);
    }
  });

  it('is false for non-milestone streak values', () => {
    for (const n of [0, 1, 2, 4, 6, 7]) {
      expect(isStreakMilestone(n)).toBe(false);
    }
  });

  it('agrees with REWARDS.streakMilestones membership', () => {
    for (let n = 0; n <= 25; n++) {
      expect(isStreakMilestone(n)).toBe(
        (REWARDS.streakMilestones as readonly number[]).includes(n),
      );
    }
  });
});

describe('streakCallout', () => {
  const activities: ActivityId[] = [
    'count',
    'numeral',
    'match',
    'quicklook',
    'compare',
    'order',
    'onemore',
    'add',
  ];

  it('includes the name when one is given', () => {
    for (const m of REWARDS.streakMilestones) {
      expect(streakCallout(m, 'count', 'Jayden')).toContain('Jayden');
    }
  });

  it('omits the name and leaves no dangling name clause when name is undefined', () => {
    for (const m of REWARDS.streakMilestones) {
      const line = streakCallout(m, 'count');
      expect(line).not.toContain('Jayden');
      // no dangling ", " name clause and no dangling " — " clause
      expect(line).not.toMatch(/,\s*!/);
      expect(line).not.toMatch(/,\s*$/);
      expect(line).not.toMatch(/—\s*$/);
      expect(line).not.toMatch(/,\s+—/);
      // no empty leftover like ", " right before sentence punctuation
      expect(line).not.toContain(', !');
      expect(line.trim()).toBe(line);
    }
  });

  it('omits the name when name is an empty string', () => {
    for (const m of REWARDS.streakMilestones) {
      const withEmpty = streakCallout(m, 'count', '');
      const withUndef = streakCallout(m, 'count');
      expect(withEmpty).toBe(withUndef);
      expect(withEmpty).not.toMatch(/,\s*!/);
      expect(withEmpty).not.toMatch(/—\s*$/);
    }
  });

  it('never contains "count" (case-insensitive) for ANY activity, with or without a name', () => {
    for (const id of activities) {
      for (const m of REWARDS.streakMilestones) {
        expect(streakCallout(m, id, 'Jayden')).not.toMatch(/count/i);
        expect(streakCallout(m, id)).not.toMatch(/count/i);
      }
    }
  });

  it('includes the spelled-out number word for listed milestones', () => {
    expect(streakCallout(3, 'match', 'Jayden')).toContain('Three');
    expect(streakCallout(5, 'numeral', 'Jayden')).toContain('Five');
    expect(streakCallout(8, 'quicklook', 'Jayden')).toContain('Eight');
    expect(streakCallout(12, 'match')).toContain('Twelve');
    expect(streakCallout(20, 'match')).toContain('Twenty');
  });

  it('produces a sensible line for a non-listed milestone (number + optional name)', () => {
    const withName = streakCallout(6, 'count', 'Jayden');
    expect(withName).toContain('Jayden');
    expect(withName).toMatch(/Six|6/);
    expect(withName).not.toMatch(/count/i);

    const noName = streakCallout(6, 'count');
    expect(noName).not.toContain('Jayden');
    expect(noName).not.toMatch(/,\s*!/);
    expect(noName).not.toMatch(/—\s*$/);
  });

  it('falls back to digits for an out-of-range milestone', () => {
    const line = streakCallout(42, 'count', 'Jayden');
    expect(line).toContain('42');
    expect(line).toContain('Jayden');
    expect(line).not.toMatch(/count/i);
  });
});
