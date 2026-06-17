/**
 * Live audio engine for Counting Friends: Web Speech for voice-over and a tiny
 * WebAudio synth for the success / try-again / chirp blips. Behaviour matches
 * the working prototype (Counting Friends.dc.html) exactly.
 *
 * Every method is defensive: in a non-browser / jsdom context where
 * `speechSynthesis` or `AudioContext` are missing, calls are safe no-ops.
 */
import type { AudioEngine } from '../game/audio';
import { SPEECH } from '../game/constants';

/** A single tone: [frequency Hz, duration s, peak gain]. */
type Note = [number, number, number];

interface WebAudioEngine extends AudioEngine {
  /** Enable/disable voice-over. Turning off also cancels any in-flight speech. */
  setEnabled(on: boolean): void;
}

type WindowWithWebkit = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function createWebAudioEngine(): WebAudioEngine {
  let enabled = true;
  let ctx: AudioContext | null = null;
  // `undefined` = not yet resolved, `null` = resolved to "no voice".
  let cachedVoice: SpeechSynthesisVoice | null | undefined = undefined;

  // Clear the cached voice once the platform finishes loading voices so the
  // next speak() re-picks from the now-populated list.
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        cachedVoice = undefined;
      };
      // Kick voice loading on platforms that populate lazily.
      window.speechSynthesis.getVoices();
    }
  } catch {
    /* no-op: speech not available */
  }

  function pickVoice(): SpeechSynthesisVoice | null {
    if (cachedVoice !== undefined) return cachedVoice;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;
      const chosen =
        voices.find(
          (v) =>
            /^en/i.test(v.lang) &&
            /(samantha|karen|moira|tessa|fiona|female|google uk english female|zira|aria|jenny)/i.test(
              v.name,
            ),
        ) ||
        voices.find((v) => /^en(-|_)?(US|GB|AU)/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang)) ||
        voices[0];
      cachedVoice = chosen ?? null;
      return cachedVoice;
    } catch {
      return null;
    }
  }

  const engine: WebAudioEngine = {
    onSpeakingChange: undefined,

    setEnabled(on: boolean) {
      enabled = on;
      if (!on) engine.cancelSpeech();
    },

    speak(text: string) {
      if (!enabled) return;
      try {
        const ss = window.speechSynthesis;
        if (!ss) return;
        ss.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = SPEECH.rate;
        u.pitch = SPEECH.pitch;
        u.volume = 1;
        const v = pickVoice();
        if (v) u.voice = v;
        u.onstart = () => engine.onSpeakingChange?.(true);
        u.onend = () => engine.onSpeakingChange?.(false);
        u.onerror = () => engine.onSpeakingChange?.(false);
        ss.speak(u);
      } catch {
        /* no-op: speech not available */
      }
    },

    cancelSpeech() {
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch {
        /* no-op */
      }
      engine.onSpeakingChange?.(false);
    },

    ensureAudio() {
      try {
        if (!ctx) {
          const w = window as WindowWithWebkit;
          const AC = w.AudioContext || w.webkitAudioContext;
          if (AC) ctx = new AC();
        }
        if (ctx && ctx.state === 'suspended') ctx.resume();
      } catch {
        /* no-op: audio not available */
      }
    },

    playPop() {
      tone([
        [523, 0.12, 0.16],
        [659, 0.12, 0.16],
        [784, 0.2, 0.18],
      ]);
    },

    playWhoops() {
      tone([
        [340, 0.16, 0.12],
        [250, 0.22, 0.12],
      ]);
    },

    playChirp() {
      tone([
        [660, 0.1, 0.12],
        [880, 0.12, 0.12],
      ]);
    },
  };

  function tone(seq: Note[]) {
    engine.ensureAudio();
    if (!ctx) return;
    const ac = ctx;
    let t = ac.currentTime + 0.01;
    for (const [freq, dur, vol] of seq) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
      t += dur * 0.78; // slight overlap between notes
    }
  }

  return engine;
}
