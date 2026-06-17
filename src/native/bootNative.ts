import { Capacitor } from '@capacitor/core';

/**
 * One-time native (iOS) boot steps, called once from main.tsx after React mounts.
 *
 * No-op on the web build — the guard returns before any Capacitor plugin is even
 * imported, so the same entry point runs unchanged in the browser and the plugin
 * code never loads on the web. All steps are best-effort: a native nicety failing
 * must never block the game from running.
 */
export async function bootNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const [{ StatusBar }, { SplashScreen }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
    ]);
    // Immersive full-screen for a pre-reader's game: hide the clock/battery chrome.
    await StatusBar.hide().catch(() => {});
    // React has mounted; dismiss the launch splash (config also auto-hides as a
    // safety net, so a missed call here can never leave the splash stuck).
    await SplashScreen.hide().catch(() => {});
  } catch {
    // Best-effort only.
  }
}
