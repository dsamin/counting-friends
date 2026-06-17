import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWebAudioEngine } from './webAudioEngine';

// ---------------------------------------------------------------------------
// Fakes for the Web Speech + WebAudio APIs. These live on `window`/`global`
// and are torn down in afterEach so each test starts from a clean slate.
// ---------------------------------------------------------------------------

interface FakeVoice {
  lang: string;
  name: string;
}

class FakeUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: FakeVoice | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

interface FakeSpeechSynthesis {
  cancel: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  getVoices: () => FakeVoice[];
  onvoiceschanged: (() => void) | null;
}

function installSpeech(voices: FakeVoice[]): FakeSpeechSynthesis {
  const ss: FakeSpeechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: () => voices,
    onvoiceschanged: null,
  };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: ss,
  });
  (
    globalThis as unknown as { SpeechSynthesisUtterance: typeof FakeUtterance }
  ).SpeechSynthesisUtterance = FakeUtterance;
  return ss;
}

interface FakeParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
}

function makeParam(): FakeParam {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

class FakeOscillator {
  type = '';
  frequency = makeParam();
  connect = vi.fn(() => ({ connect: vi.fn() }));
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = makeParam();
  connect = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: 'running' | 'suspended' = 'running';
  currentTime = 5;
  destination = {};
  resume = vi.fn();
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  createOscillator(): FakeOscillator {
    const o = new FakeOscillator();
    this.oscillators.push(o);
    return o;
  }
  createGain(): FakeGain {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
}

function installAudio(): typeof FakeAudioContext {
  FakeAudioContext.instances = [];
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    value: FakeAudioContext,
  });
  // Make sure no leftover webkit alias shadows it.
  Object.defineProperty(window, 'webkitAudioContext', {
    configurable: true,
    value: undefined,
  });
  return FakeAudioContext;
}

const PREFERRED_VOICES: FakeVoice[] = [
  { lang: 'en-US', name: 'Alex' },
  { lang: 'en-US', name: 'Samantha' },
  { lang: 'fr-FR', name: 'Amelie' },
];

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
  delete (globalThis as unknown as { SpeechSynthesisUtterance?: unknown })
    .SpeechSynthesisUtterance;
});

describe('createWebAudioEngine — speak (Web Speech)', () => {
  let ss: FakeSpeechSynthesis;
  beforeEach(() => {
    ss = installSpeech(PREFERRED_VOICES);
  });

  it('cancels first, then speaks an utterance with the prototype rate/pitch/volume and text', () => {
    const engine = createWebAudioEngine();
    engine.speak('How many ducks?');

    expect(ss.cancel).toHaveBeenCalledTimes(1);
    expect(ss.speak).toHaveBeenCalledTimes(1);
    const u = ss.speak.mock.calls[0][0] as FakeUtterance;
    expect(u.text).toBe('How many ducks?');
    expect(u.rate).toBe(0.92);
    expect(u.pitch).toBe(1.18);
    expect(u.volume).toBe(1);
  });

  it('chooses the preferred (Samantha-style) voice when present', () => {
    const engine = createWebAudioEngine();
    engine.speak('How many ducks?');
    const u = ss.speak.mock.calls[0][0] as FakeUtterance;
    expect(u.voice).toEqual({ lang: 'en-US', name: 'Samantha' });
  });

  it('does nothing when disabled and resumes after re-enabling', () => {
    const engine = createWebAudioEngine();
    engine.setEnabled(false);
    engine.speak('How many ducks?');
    expect(ss.speak).not.toHaveBeenCalled();
    // turning off also cancels any in-flight speech
    expect(ss.cancel).toHaveBeenCalledTimes(1);

    engine.setEnabled(true);
    engine.speak('How many ducks?');
    expect(ss.speak).toHaveBeenCalledTimes(1);
  });

  it('drives onSpeakingChange(true) on utterance start and (false) on end', () => {
    const engine = createWebAudioEngine();
    const seen: boolean[] = [];
    engine.onSpeakingChange = (b) => seen.push(b);
    engine.speak('hi');
    const u = ss.speak.mock.calls[0][0] as FakeUtterance;
    u.onstart?.();
    u.onend?.();
    expect(seen).toEqual([true, false]);
  });

  it('drives onSpeakingChange(false) on utterance error', () => {
    const engine = createWebAudioEngine();
    const seen: boolean[] = [];
    engine.onSpeakingChange = (b) => seen.push(b);
    engine.speak('hi');
    const u = ss.speak.mock.calls[0][0] as FakeUtterance;
    u.onerror?.();
    expect(seen).toEqual([false]);
  });
});

describe('createWebAudioEngine — pickVoice fallback chain', () => {
  it('falls back to the first en-US/GB/AU voice when no preferred name matches', () => {
    const ss = installSpeech([
      { lang: 'de-DE', name: 'Anna' },
      { lang: 'en-GB', name: 'Daniel' },
      { lang: 'en-US', name: 'Fred' },
    ]);
    const engine = createWebAudioEngine();
    engine.speak('x');
    const u = ss.speak.mock.calls[0][0] as FakeUtterance;
    expect(u.voice).toEqual({ lang: 'en-GB', name: 'Daniel' });
  });

  it('falls back to any en voice when no en-US/GB/AU present', () => {
    const ss = installSpeech([
      { lang: 'de-DE', name: 'Anna' },
      { lang: 'en-IN', name: 'Rishi' },
    ]);
    const engine = createWebAudioEngine();
    engine.speak('x');
    const u = ss.speak.mock.calls[0][0] as FakeUtterance;
    expect(u.voice).toEqual({ lang: 'en-IN', name: 'Rishi' });
  });

  it('falls back to voices[0] when there is no en voice at all', () => {
    const ss = installSpeech([
      { lang: 'de-DE', name: 'Anna' },
      { lang: 'fr-FR', name: 'Amelie' },
    ]);
    const engine = createWebAudioEngine();
    engine.speak('x');
    const u = ss.speak.mock.calls[0][0] as FakeUtterance;
    expect(u.voice).toEqual({ lang: 'de-DE', name: 'Anna' });
  });

  it('caches the chosen voice (getVoices not re-read on second speak)', () => {
    const ss = installSpeech(PREFERRED_VOICES);
    const engine = createWebAudioEngine();
    // Spy after construction so the constructor's voice warm-up isn't counted;
    // we only care that pickVoice reads the list once and caches across speaks.
    const spy = vi.spyOn(ss, 'getVoices');
    engine.speak('a');
    engine.speak('b');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('clears the cache when onvoiceschanged fires so voices re-pick once loaded', () => {
    const ss = installSpeech([]); // no voices yet
    const engine = createWebAudioEngine();
    engine.speak('a'); // nothing to pick -> no voice assigned
    let u = ss.speak.mock.calls[0][0] as FakeUtterance;
    expect(u.voice).toBeNull();

    // voices arrive
    ss.getVoices = () => PREFERRED_VOICES;
    ss.onvoiceschanged?.();

    engine.speak('b');
    u = ss.speak.mock.calls[1][0] as FakeUtterance;
    expect(u.voice).toEqual({ lang: 'en-US', name: 'Samantha' });
  });
});

describe('createWebAudioEngine — cancelSpeech', () => {
  it('cancels speech and reports not-speaking', () => {
    const ss = installSpeech(PREFERRED_VOICES);
    const engine = createWebAudioEngine();
    const seen: boolean[] = [];
    engine.onSpeakingChange = (b) => seen.push(b);
    engine.cancelSpeech();
    expect(ss.cancel).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([false]);
  });
});

describe('createWebAudioEngine — ensureAudio (WebAudio)', () => {
  it('creates the context once and resumes when suspended', () => {
    const AC = installAudio();
    const engine = createWebAudioEngine();
    engine.ensureAudio();
    engine.ensureAudio();
    expect(AC.instances.length).toBe(1);

    const ctx = AC.instances[0];
    expect(ctx.resume).not.toHaveBeenCalled(); // state was 'running'

    ctx.state = 'suspended';
    engine.ensureAudio();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(AC.instances.length).toBe(1); // still only one context
  });
});

describe('createWebAudioEngine — SFX tones', () => {
  it('playPop schedules 3 rising oscillators starting at 523Hz with gain ramps', () => {
    const AC = installAudio();
    const engine = createWebAudioEngine();
    engine.playPop();
    const ctx = AC.instances[0];
    expect(ctx.oscillators).toHaveLength(3);
    expect(ctx.oscillators[0].frequency.value).toBe(523);
    expect(ctx.oscillators[1].frequency.value).toBe(659);
    expect(ctx.oscillators[2].frequency.value).toBe(784);
    expect(ctx.oscillators[0].type).toBe('sine');
    // gain envelope wired for first note
    const g = ctx.gains[0];
    expect(g.gain.setValueAtTime).toHaveBeenCalledWith(0.0001, expect.any(Number));
    expect(g.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.16,
      expect.any(Number),
    );
    expect(g.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      0.0001,
      expect.any(Number),
    );
    expect(ctx.oscillators[0].start).toHaveBeenCalledTimes(1);
    expect(ctx.oscillators[0].stop).toHaveBeenCalledTimes(1);
  });

  it('playWhoops schedules 2 descending oscillators starting at 340Hz', () => {
    const AC = installAudio();
    const engine = createWebAudioEngine();
    engine.playWhoops();
    const ctx = AC.instances[0];
    expect(ctx.oscillators).toHaveLength(2);
    expect(ctx.oscillators[0].frequency.value).toBe(340);
    expect(ctx.oscillators[1].frequency.value).toBe(250);
  });

  it('playChirp schedules 2 rising oscillators starting at 660Hz', () => {
    const AC = installAudio();
    const engine = createWebAudioEngine();
    engine.playChirp();
    const ctx = AC.instances[0];
    expect(ctx.oscillators).toHaveLength(2);
    expect(ctx.oscillators[0].frequency.value).toBe(660);
    expect(ctx.oscillators[1].frequency.value).toBe(880);
  });

  it('lazily creates the context on first SFX call via ensureAudio', () => {
    const AC = installAudio();
    const engine = createWebAudioEngine();
    expect(AC.instances.length).toBe(0);
    engine.playPop();
    expect(AC.instances.length).toBe(1);
  });
});

describe('createWebAudioEngine — non-browser safety (no APIs)', () => {
  it('every method is a no-op and does not throw when speechSynthesis/AudioContext are absent', () => {
    // afterEach already deletes the globals; nothing installed here.
    const engine = createWebAudioEngine();
    expect(() => {
      engine.ensureAudio();
      engine.speak('hello');
      engine.playPop();
      engine.playWhoops();
      engine.playChirp();
      engine.cancelSpeech();
      engine.setEnabled(false);
      engine.setEnabled(true);
    }).not.toThrow();
  });
});
