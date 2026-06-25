import { describe, it, expect } from 'vitest';
import { ACTIVITIES, getActivity } from './index';
import { count } from './count';

describe('activity registry', () => {
  it('registers the release activities under their ids', () => {
    expect(ACTIVITIES.count).toBe(count);
    for (const id of ['count', 'numeral', 'quicklook', 'match'] as const) {
      expect(ACTIVITIES[id]?.id).toBe(id);
    }
  });

  it('getActivity returns a registered module', () => {
    expect(getActivity('count')).toBe(count);
    expect(getActivity('match').id).toBe('match');
  });

  it('getActivity throws for an unregistered (not-yet-implemented) activity', () => {
    // Arithmetic activities are Phase 4 — not registered yet.
    expect(() => getActivity('add')).toThrow(/add/);
  });
});
