/**
 * Activity framework types (Counting Friends v2). Pinned by the FINAL spec §4.1.
 * Each challenge is a self-contained `ActivityModule`: a pure round generator, a
 * pure `evaluate` (replacing v1's single-boolean correctness), and a prompt
 * builder. The shared engine (`useGame`) owns timers, audio, celebration,
 * streak/stars, adaptive level, and persistence — activities never re-implement
 * feedback.
 */
import type { Character, Rng } from '../types';

export type ActivityId =
  | 'count'
  | 'numeral'
  | 'match'
  | 'quicklook'
  | 'compare'
  | 'order'
  | 'onemore'
  | 'add';

/** Adaptive difficulty level. Integer ≥ 1. Plain alias (no brand). */
export type Level = number;

/** What an activity component sends back to the engine on a tap/connect. */
export type AnswerPayload =
  | { kind: 'tile'; value: number } // count, numeral, quicklook, compare, onemore, add
  | { kind: 'pair'; leftId: string; rightId: string } // match (one connect)
  | { kind: 'sequence'; values: number[] }; // order (build mode, running sequence)

/** Spoken + visual/assistive prompt for a round. */
export interface SpeechAndCue {
  /** Spoken via TTS (and the on-screen cue if any). */
  speech: string;
  /** aria-live text for assistive tech (usually === speech). */
  aria: string;
}

/** Result of evaluating ONE answer payload against a round. */
export interface EvalResult {
  /** Was THIS payload correct? (a correct single connect; a correct tile.) */
  correct: boolean;
  /** Is the whole round now finished? (single-tap activities: === correct.) */
  roundComplete: boolean;
}

// ---- Per-activity round shapes (§5). One discriminant `kind` each. ----

export interface CountRound {
  kind: 'count';
  count: number;
  animal: Character;
  choices: number[];
}

export interface NumeralRound {
  kind: 'numeral';
  target: number;
  choices: number[];
  lookAlike: boolean;
}

export interface MatchItem {
  id: string;
  kind: 'group' | 'numeral';
  value: number;
}

export interface MatchRound {
  kind: 'match';
  variant: 'groupNum'; // release; 'dotsNum' | 'numWord' later
  left: MatchItem[]; // groups (rendered as N friends), shuffled
  right: MatchItem[]; // numerals, shuffled
  /** correct pairing: leftId → rightId */
  solution: Record<string, string>;
}

export interface QuickLookRound {
  kind: 'quicklook';
  count: number;
  choices: number[];
  revealMs: number;
  arrangement: 'dice' | 'random';
}

export interface CompareRound {
  kind: 'compare';
  left: number;
  right: number;
  ask: 'more' | 'fewer';
}

export interface OrderRound {
  kind: 'order';
  mode: 'build' | 'next';
  numbers: number[];
  answer: number[];
}

export interface OneMoreRound {
  kind: 'onemore';
  base: number;
  delta: 1 | -1;
  choices: number[];
}

export interface AddRound {
  kind: 'add';
  a: number;
  b: number;
  op: '+' | '-';
  choices: number[];
}

/** Discriminated union — each activity has its own round shape (§5). */
export type Round =
  | CountRound
  | NumeralRound
  | MatchRound
  | QuickLookRound
  | CompareRound
  | OrderRound
  | OneMoreRound
  | AddRound;

export interface ActivityModule<R extends Round = Round> {
  id: ActivityId;
  /** Pure round generator — deterministic given rng. */
  generate(level: Level, rng: Rng): R;
  /**
   * Pure evaluation of one answer payload. Replaces the v1 single-boolean
   * `isCorrect`. Single-tap activities return `roundComplete === correct`.
   * Multi-step activities (match, order) express partial vs complete via the
   * round + the payload; see each activity's contract in §5.
   */
  evaluate(round: R, answer: AnswerPayload): EvalResult;
  /** Spoken + assistive prompt for this round. */
  prompt(round: R, childName?: string): SpeechAndCue;
}
