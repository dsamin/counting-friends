import { describe, it, expect } from 'vitest';
import { ACTIVITIES, getActivity } from './index';
import { count } from './count';

describe('activity registry', () => {
  it('registers the count activity under its id', () => {
    expect(ACTIVITIES.count).toBe(count);
    expect(ACTIVITIES.count?.id).toBe('count');
  });

  it('getActivity returns a registered module', () => {
    expect(getActivity('count')).toBe(count);
  });

  it('getActivity throws for an unregistered (not-yet-implemented) activity', () => {
    expect(() => getActivity('numeral')).toThrow(/numeral/);
  });
});
