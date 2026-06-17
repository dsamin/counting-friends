import { describe, it, expect } from 'vitest';
import { silentAudio } from './audio';

describe('silentAudio', () => {
  it('implements every AudioEngine method as a no-op that does not throw', () => {
    expect(() => {
      silentAudio.ensureAudio();
      silentAudio.speak('hello');
      silentAudio.playPop();
      silentAudio.playWhoops();
      silentAudio.playChirp();
      silentAudio.cancelSpeech();
    }).not.toThrow();
  });

  it('has no onSpeakingChange by default', () => {
    expect(silentAudio.onSpeakingChange).toBeUndefined();
  });
});
