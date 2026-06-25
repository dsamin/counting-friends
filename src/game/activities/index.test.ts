import { describe, it, expect } from 'vitest';
import { ACTIVITIES, getActivity } from './index';
import { count } from './count';

describe('activity registry', () => {
  it('registers every activity under its id', () => {
    expect(ACTIVITIES.count).toBe(count);
    for (const id of [
      'count',
      'numeral',
      'quicklook',
      'match',
      'compare',
      'order',
      'onemore',
      'add',
    ] as const) {
      expect(ACTIVITIES[id]?.id).toBe(id);
    }
  });

  it('getActivity returns a registered module', () => {
    expect(getActivity('count')).toBe(count);
    expect(getActivity('match').id).toBe('match');
    expect(getActivity('add').id).toBe('add');
  });

  it('getActivity throws for an unregistered id', () => {
    expect(() => getActivity('nope' as never)).toThrow(/nope/);
  });
});
