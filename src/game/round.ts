import type { Character } from './types';
import { CONFETTI, WORDS } from './constants';

/**
 * Round-adjacent pure helpers shared across the app. Round *generation* now lives
 * in the Activity framework (`src/game/activities/*`); what remains here are the
 * presentation helpers still used by the play UI and the audio engine.
 */

/** Clamp `val` into the inclusive range [min, max]. */
function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Pixel size for an animal given how many are on screen — more animals,
 * smaller each, clamped to [58, 160]. Matches the prototype exactly.
 */
export function animalSize(count: number): number {
  return Math.round(clamp(58, 560 / Math.sqrt(Math.max(1, count)), 160));
}

/**
 * How many confetti particles a celebration fires. Reduce-motion always
 * collapses to a handful of soft sparkles; otherwise the `confettiDensity`
 * prop picks the calm (34) or full (74) burst.
 */
export function confettiCount(
  reduceMotion: boolean,
  density: 'full' | 'calm',
): number {
  if (reduceMotion) return CONFETTI.sparkles;
  return density === 'calm' ? CONFETTI.calm : CONFETTI.full;
}

/** Capitalize the first letter of a word. */
function cap(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/**
 * Spoken praise after a correct tap, matching the prototype's `speakPraise`
 * concatenation exactly (including the comma after the exclamation when a child
 * name is set): e.g. "Three! Hooray!, Jayden".
 */
export function praiseLine(
  count: number,
  praise: string,
  childName?: string,
): string {
  const word = cap(WORDS[count] ?? String(count));
  const name = childName ? ', ' + childName : '';
  return word + '! ' + praise + name;
}

/** The mascot's question, e.g. "How many ducks?". */
export function promptLine(animal: Character): string {
  return 'How many ' + animal.plural + '?';
}
