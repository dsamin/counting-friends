import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the native iPad app.
 *
 * The web/PWA build (GitHub Pages) is unaffected by this file — it only governs
 * the native wrapper produced from the CAP_BUILD=1 / VITE_BASE=/ build (see
 * `npm run build:native`). `server` is intentionally left at its default
 * (capacitor://localhost) so the app runs fully offline from the bundled assets.
 */
const config: CapacitorConfig = {
  appId: 'app.countingfriends.game',
  appName: 'Counting Friends',
  webDir: 'dist',
  ios: {
    // Match the app's cream background so there's no flash of white/black behind
    // the web view while it loads. contentInset:'never' keeps the web view edge
    // to edge — safe areas are handled in CSS via env(safe-area-inset-*).
    backgroundColor: '#FBF3DC',
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      // We hide the splash from JS once React mounts (see src/native/bootNative.ts).
      // launchAutoHide stays true with a short duration as a safety net so the
      // splash can never get stuck if that call is ever missed.
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#FBF3DC',
      showSpinner: false,
    },
  },
};

export default config;
