import { Capacitor } from '@capacitor/core';

/**
 * Native haptic feedback. Every export is a no-op on the web build (the guard
 * returns before any plugin import) and best-effort on native — a haptic
 * failing must never throw into the game loop. Plugin code is dynamically
 * imported so it never enters the web bundle's critical path.
 */

/** Celebratory success buzz, fired alongside the win confetti. */
export function celebrate(): void {
  if (!Capacitor.isNativePlatform()) return;
  void (async () => {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      /* best-effort */
    }
  })();
}

/** Light tactile tick for an animal tap. */
export function tap(): void {
  if (!Capacitor.isNativePlatform()) return;
  void (async () => {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* best-effort */
    }
  })();
}
