import { describe, it, expect, afterEach, vi } from 'vitest';
import { prefersReducedMotion } from './reduceMotion';

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when the OS prefers reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as unknown as MediaQueryList);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when the OS does not prefer reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as unknown as MediaQueryList);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns false when matchMedia is unavailable (old browser / SSR)', () => {
    const original = window.matchMedia;
    // @ts-expect-error — simulate an environment without matchMedia.
    delete window.matchMedia;
    try {
      expect(prefersReducedMotion()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});
