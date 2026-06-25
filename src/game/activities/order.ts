import type { Level, ActivityModule, OrderRound } from './types';

/**
 * Put It in Order (§5.6) — two sub-modes by level:
 *  - `next`: show a consecutive run ("5, 6, 7, …?") → tap the next numeral.
 *  - `build`: show distinct numerals shuffled → tap them into ascending order.
 *
 * Level → knobs per the FINAL spec §5.6 / §6.3. `OrderRound` carries only
 * `numbers` (the shown sequence) and `answer`; the tap choices for `next` are
 * built by the component (the round type has no `choices` field), so the
 * generator stays purely about the sequence. `choiceCount` is surfaced via
 * `orderParams` for that component to consume — it never affects `generate`.
 */
export function orderParams(
  level: Level,
): { mode: 'next' | 'build'; count: number; max: number; choiceCount: number } {
  if (level <= 2) return { mode: 'next', count: 3, max: 10, choiceCount: 3 };
  if (level <= 4) return { mode: 'build', count: 3, max: 10, choiceCount: 3 };
  return { mode: 'build', count: 4, max: 20, choiceCount: 4 }; // L5+
}

export const order: ActivityModule<OrderRound> = {
  id: 'order',

  generate(level, rng) {
    const { mode, count, max } = orderParams(level);

    if (mode === 'next') {
      // start s so the run AND its successor fit in [1..max]: s ∈ [1, max-count].
      const start = 1 + Math.floor(rng() * (max - count)); // draw 1: run start
      const numbers: number[] = [];
      for (let i = 0; i < count; i += 1) numbers.push(start + i);
      return { kind: 'order', mode: 'next', numbers, answer: [start + count] };
    }

    // build: pick `count` DISTINCT values in [1..max], show shuffled, sort = answer.
    const set = new Set<number>();
    let guard = 0;
    while (set.size < count && guard < 500) {
      guard += 1;
      set.add(1 + Math.floor(rng() * max)); // draws 1..n: distinct value picks
    }
    const numbers = [...set];
    // Fisher–Yates shuffle the presentation order (position must not leak order).
    for (let i = numbers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = numbers[i];
      numbers[i] = numbers[j];
      numbers[j] = tmp;
    }
    const answer = [...numbers].sort((a, b) => a - b);
    return { kind: 'order', mode: 'build', numbers, answer };
  },

  evaluate(round, answer) {
    if (round.mode === 'next') {
      const correct = answer.kind === 'tile' && answer.value === round.answer[0];
      return { correct, roundComplete: correct }; // single-tap: complete === correct
    }

    // build: a `sequence` payload is a running list of tapped values; it is
    // correct iff it is an ascending PREFIX of the answer, complete iff full.
    if (answer.kind !== 'sequence') return { correct: false, roundComplete: false };
    const { values } = answer;
    const isPrefix = values.every((v, i) => v === round.answer[i]);
    return {
      correct: isPrefix,
      roundComplete: isPrefix && values.length === round.answer.length,
    };
  },

  prompt(round) {
    const line = round.mode === 'next' ? 'What comes next?' : 'Put the numbers in order!';
    return { speech: line, aria: line };
  },
};
