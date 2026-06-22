import type { AudioEngine } from '../game/audio';
import { createWebAudioEngine } from '../audio/webAudioEngine';
import { SPEECH } from '../game/constants';

/**
 * Native (iOS) audio engine for the Capacitor app.
 *
 * Why this exists: Web Speech (`speechSynthesis`) is unreliable inside an iOS
 * WKWebView — `getVoices()` is frequently empty, so prompts can go silent. Since
 * "voice carries meaning" is core to the game, native builds speak through the
 * rock-solid iOS speech synthesizer (`@capacitor-community/text-to-speech`,
 * which uses the system en-US voice — Samantha, the very voice the web picker
 * prefers).
 *
 * It is a COMPOSITE, not a rewrite: SFX (`playPop/Whoops/Chirp`), `ensureAudio`,
 * and the enabled flag all reuse the proven `createWebAudioEngine()`. Only
 * `speak`/`cancelSpeech` are overridden. Because the plugin's `speak()` is async
 * and emits no start/stop events, we synthesize `onSpeakingChange(true|false)`
 * around it so the visible ReplayPill "speaking" animation still fires.
 */
export function createNativeAudioEngine(): AudioEngine {
  // Reuse the WebAudio engine for blips + audio-context unlock. We never call its
  // speak()/cancelSpeech(); those are replaced below.
  const base = createWebAudioEngine();
  let enabled = true;
  // Monotonic guard so a newer speak()/cancel supersedes any in-flight utterance
  // (prevents a late onSpeakingChange(false) from clobbering a fresh prompt).
  let seq = 0;

  const engine: AudioEngine = {
    onSpeakingChange: undefined,

    ensureAudio: () => base.ensureAudio(),
    playPop: () => base.playPop(),
    playWhoops: () => base.playWhoops(),
    playChirp: () => base.playChirp(),

    setEnabled(on: boolean) {
      enabled = on;
      base.setEnabled?.(on);
      if (!on) engine.cancelSpeech();
    },

    speak(text: string) {
      if (!enabled) return;
      const mine = ++seq;
      void (async () => {
        try {
          const { TextToSpeech } = await import(
            '@capacitor-community/text-to-speech'
          );
          await TextToSpeech.stop().catch(() => {});
          if (mine !== seq) return; // superseded before we started
          engine.onSpeakingChange?.(true);
          await TextToSpeech.speak({
            text,
            lang: 'en-US',
            rate: SPEECH.rate,
            pitch: SPEECH.pitch,
            volume: 1,
          });
        } catch {
          /* best-effort: never break the game if TTS fails */
        } finally {
          if (mine === seq) engine.onSpeakingChange?.(false);
        }
      })();
    },

    cancelSpeech() {
      seq++; // invalidate any in-flight utterance
      void import('@capacitor-community/text-to-speech')
        .then(({ TextToSpeech }) => TextToSpeech.stop().catch(() => {}))
        .catch(() => {});
      engine.onSpeakingChange?.(false);
    },
  };

  return engine;
}
