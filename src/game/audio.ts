/**
 * Audio output surface for the game. The real Web Speech / WebAudio
 * implementation lives elsewhere; the hook depends only on this interface so
 * it can be driven by `silentAudio` in tests and by a live engine in the app.
 */
export interface AudioEngine {
  /** Unlock/resume audio in response to a user gesture. */
  ensureAudio(): void;
  /** Speak `text` via TTS; should drive `onSpeakingChange(true/false)`. */
  speak(text: string): void;
  /** Short success blip. */
  playPop(): void;
  /** Gentle "try again" tone. */
  playWhoops(): void;
  /** Animal-tap chirp. */
  playChirp(): void;
  /** Stop any in-flight speech immediately. */
  cancelSpeech(): void;
  /** Optional callback the engine invokes as speech starts/stops. */
  onSpeakingChange?: (speaking: boolean) => void;
}

/** A no-op engine: lets the hook run with audio fully disabled (and in tests). */
export const silentAudio: AudioEngine = {
  ensureAudio() {},
  speak() {},
  playPop() {},
  playWhoops() {},
  playChirp() {},
  cancelSpeech() {},
};
