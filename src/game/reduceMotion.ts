/**
 * Read the OS `prefers-reduced-motion` preference. Single source of truth so
 * JS-driven motion (confetti, button squash/wobble, animal entrance) and the
 * CSS `@media (prefers-reduced-motion: reduce)` safety net stay in agreement.
 *
 * SSR/old-browser safe: returns false when `window`/`matchMedia` are
 * unavailable.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
