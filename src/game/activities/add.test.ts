import { describe, it, expect } from 'vitest';
import type { Rng } from '../types';
import { add, addParams } from './add';

function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('addParams (§5.8 / §6.3 level table)', () => {
  it('maps levels to {max, ops, choiceCount}', () => {
    expect(addParams(1)).toEqual({ max: 5, ops: ['+'], choiceCount: 3 });
    expect(addParams(2)).toEqual({ max: 5, ops: ['+'], choiceCount: 3 });
    expect(addParams(3)).toEqual({ max: 10, ops: ['+', '-'], choiceCount: 4 });
    expect(addParams(4)).toEqual({ max: 10, ops: ['+', '-'], choiceCount: 4 });
    expect(addParams(5)).toEqual({ max: 10, ops: ['+', '-'], choiceCount: 4 });
  });
  it('clamps levels at/above 5 to the top band', () => {
    expect(addParams(6)).toEqual({ max: 10, ops: ['+', '-'], choiceCount: 4 });
    expect(addParams(99)).toEqual({ max: 10, ops: ['+', '-'], choiceCount: 4 });
  });
  it('clamps levels below 1 to L1', () => {
    expect(addParams(0)).toEqual({ max: 5, ops: ['+'], choiceCount: 3 });
  });
});

describe('add.generate (pinned)', () => {
  it('L1 within-5 addition: op draw, then a, then b, then choices', () => {
    // L1 -> max5/ops['+']/3choices. only op is '+', so the op draw is consumed
    // but always yields '+'. within-5 floor: a,b in [1..4], a+b <= 5.
    // a-draw 0 -> a=1; b-draw 0 -> b=1; result=2.
    // buildChoices over [0..5]: distractor draws fill to 3, then shuffle.
    const round = add.generate(1, stubRng([0, 0, 0, 0.5, 0.99, 0, 0, 0]));
    expect(round.kind).toBe('add');
    expect(round.op).toBe('+');
    expect(round.a).toBe(1);
    expect(round.b).toBe(1);
    expect(round.choices).toContain(2);
    expect(round.choices).toHaveLength(3);
  });

  it('L3 subtraction can be selected and yields a valid non-negative result', () => {
    // L3 -> max10/ops['+','-']/4choices. op draw 0.99 -> ops[1] = '-'.
    // minuend m = 2+floor(0.5*9)=6; subtrahend s = 1+floor(0.0*5)=1; result=5.
    // buildChoices(5,4,10): draws 0.0->1, 0.2->3, 0.8->9 => {5,1,3,9}; shuffle.
    const round = add.generate(
      3,
      stubRng([0.99, 0.5, 0.0, 0.0, 0.2, 0.8, 0, 0, 0]),
    );
    expect(round.kind).toBe('add');
    expect(round.op).toBe('-');
    expect(round.a).toBe(6);
    expect(round.b).toBe(1);
    expect(round.a - round.b).toBe(5);
    expect(round.choices).toContain(5);
    expect(round.choices).toHaveLength(4);
  });

  it('L1 never produces subtraction (ops is + only)', () => {
    for (let i = 0; i < 50; i += 1) {
      const r = add.generate(1, Math.random);
      expect(r.op).toBe('+');
    }
  });

  it('upholds invariants under fuzzing across levels (500x each)', () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const { max, ops, choiceCount } = addParams(level);
      const withinFiveFloor = max === 5;
      for (let i = 0; i < 500; i += 1) {
        const r = add.generate(level, Math.random);
        expect(r.kind).toBe('add');
        expect(ops).toContain(r.op);
        const result = r.op === '+' ? r.a + r.b : r.a - r.b;
        // result non-negative and in range
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(max);
        // addends valid
        expect(r.a).toBeGreaterThanOrEqual(1);
        if (r.op === '+') {
          expect(r.b).toBeGreaterThanOrEqual(1);
          expect(r.a + r.b).toBeLessThanOrEqual(max);
          if (withinFiveFloor) {
            // within-5 floor: addends <= 4, result <= 5
            expect(r.a).toBeLessThanOrEqual(4);
            expect(r.b).toBeLessThanOrEqual(4);
            expect(r.a + r.b).toBeLessThanOrEqual(5);
          }
        } else {
          // subtraction: 1 <= b < a, a <= max
          expect(r.b).toBeGreaterThanOrEqual(1);
          expect(r.b).toBeLessThan(r.a);
          expect(r.a).toBeLessThanOrEqual(max);
        }
        // choices invariants
        expect(r.choices).toHaveLength(choiceCount);
        expect(r.choices).toContain(result);
        expect(new Set(r.choices).size).toBe(r.choices.length);
        for (const c of r.choices) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(max);
        }
      }
    }
  });
});

describe('add.evaluate', () => {
  const addition = add.generate(1, stubRng([0, 0, 0, 0.5, 0.99, 0, 0, 0])); // 1+1=2
  it('correct tile (result) is correct and completes the round', () => {
    expect(add.evaluate(addition, { kind: 'tile', value: 2 })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });
  it('wrong tile is incorrect and does not complete', () => {
    expect(add.evaluate(addition, { kind: 'tile', value: 1 })).toEqual({
      correct: false,
      roundComplete: false,
    });
  });
  it('subtraction: correct === a-b', () => {
    const sub = add.generate(3, stubRng([0.99, 0.5, 0.0, 0.0, 0.2, 0.8, 0, 0, 0]));
    const result = sub.a - sub.b; // 6 - 1 = 5
    expect(add.evaluate(sub, { kind: 'tile', value: result })).toEqual({
      correct: true,
      roundComplete: true,
    });
  });
  it('non-tile payloads are never correct', () => {
    expect(
      add.evaluate(addition, { kind: 'pair', leftId: 'a', rightId: 'b' }),
    ).toEqual({ correct: false, roundComplete: false });
  });
});

describe('add.prompt', () => {
  it('addition: "{WORDS[a]} and {WORDS[b]} more. How many altogether?"', () => {
    const round = add.generate(1, stubRng([0, 0, 0, 0.5, 0.99, 0, 0, 0])); // 1 + 1
    expect(add.prompt(round)).toEqual({
      speech: 'One and one more. How many altogether?',
      aria: 'One and one more. How many altogether?',
    });
  });
  it('subtraction: "{WORDS[a]} take away {WORDS[b]}. How many are left?"', () => {
    // a=6, b=1 -> "Six take away one. How many are left?"
    const round = add.generate(
      3,
      stubRng([0.99, 0.5, 0.0, 0.0, 0.2, 0.8, 0, 0, 0]),
    );
    expect(round.a).toBe(6);
    expect(round.b).toBe(1);
    expect(add.prompt(round)).toEqual({
      speech: 'Six take away one. How many are left?',
      aria: 'Six take away one. How many are left?',
    });
  });
});
