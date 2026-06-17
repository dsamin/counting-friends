import type { Character, Rng, Round, Tier } from './types';
import { CHARACTERS } from './characters';
import { WORDS } from './constants';

/** Highest count for a tier: easy 5, medium 10, hard 20. */
export function tierMax(t: Tier): number {
  return t === 'easy' ? 5 : t === 'medium' ? 10 : 20;
}

/** Number of answer buttons for a tier: easy 3, otherwise 4. */
export function tierChoices(t: Tier): number {
  return t === 'easy' ? 3 : 4;
}

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
 * Build one round: a target count, a friend, and a sorted set of unique
 * answer choices that always contains the correct count.
 */
export function generateRound(tier: Tier, rng: Rng = Math.random): Round {
  const max = tierMax(tier);
  const count = 1 + Math.floor(rng() * max);
  const animal = CHARACTERS[Math.floor(rng() * CHARACTERS.length)];

  const set = new Set<number>([count]);
  let guard = 0;
  while (set.size < tierChoices(tier) && guard++ < 200) {
    set.add(1 + Math.floor(rng() * max));
  }
  const choices = [...set].sort((a, b) => a - b);

  return { count, animal, choices };
}

/** Capitalize the first letter of a word. */
function cap(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/**
 * Spoken praise after a correct tap, matching the prototype's
 * `speakPraise` concatenation exactly (including the comma after the
 * exclamation when a child name is set): e.g. "Three! Hooray!, Jayden".
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
