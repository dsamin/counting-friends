import { describe, it, expect } from 'vitest';
import type { Rng, Tier } from './types';
import {
  tierMax,
  tierChoices,
  animalSize,
  generateRound,
  praiseLine,
  promptLine,
} from './round';
import { CHARACTERS } from './characters';

/**
 * Array-backed deterministic RNG. Returns scripted values in order, then
 * cycles. Each value must be in [0, 1) like Math.random.
 */
function stubRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('tierMax', () => {
  it('returns 5 for easy', () => {
    expect(tierMax('easy')).toBe(5);
  });
  it('returns 10 for medium', () => {
    expect(tierMax('medium')).toBe(10);
  });
  it('returns 20 for hard', () => {
    expect(tierMax('hard')).toBe(20);
  });
});

describe('tierChoices', () => {
  it('returns 3 for easy', () => {
    expect(tierChoices('easy')).toBe(3);
  });
  it('returns 4 for medium', () => {
    expect(tierChoices('medium')).toBe(4);
  });
  it('returns 4 for hard', () => {
    expect(tierChoices('hard')).toBe(4);
  });
});

describe('animalSize', () => {
  it('clamps small counts to the max of 160', () => {
    // count 1 -> 560/1 = 560 -> clamp to 160
    expect(animalSize(1)).toBe(160);
    // count 4 -> 560/2 = 280 -> clamp to 160
    expect(animalSize(4)).toBe(160);
    // count 9 -> 560/3 = 186.67 -> clamp to 160
    expect(animalSize(9)).toBe(160);
  });
  it('scales between the clamp boundaries', () => {
    // count 16 -> 560/4 = 140
    expect(animalSize(16)).toBe(140);
    // count 20 -> 560/sqrt(20) = 125.2 -> round 125
    expect(animalSize(20)).toBe(125);
    // count 36 -> 560/6 = 93.33 -> round 93
    expect(animalSize(36)).toBe(93);
  });
  it('clamps very large counts to the min of 58', () => {
    // count 100 -> 560/10 = 56 -> clamp to 58
    expect(animalSize(100)).toBe(58);
    expect(animalSize(10000)).toBe(58);
  });
  it('treats count 0 (and negatives) as at least 1', () => {
    // Math.max(1, count) guards the sqrt
    expect(animalSize(0)).toBe(160);
  });
});

describe('generateRound', () => {
  it('derives count and animal from the rng (deterministic stub)', () => {
    // easy: max 5, choices 3.
    // rng[0] for count: 0.5 -> 1 + floor(0.5*5)=1+2=3
    // rng[1] for animal: 0 -> CHARACTERS[0] = duck
    // distractors: need 2 more. rng[2]=0 -> 1, rng[3]=0.999 -> 1+floor(4.995)=5
    const rng = stubRng([0.5, 0, 0, 0.999]);
    const round = generateRound('easy', rng);
    expect(round.count).toBe(3);
    expect(round.animal).toBe(CHARACTERS[0]);
    expect(round.animal.key).toBe('duck');
    expect(round.choices).toEqual([1, 3, 5]);
  });

  it('always includes the correct count even if rng never produces it', () => {
    // count = 2; distractors rng all produce values != 2
    // rng[0]=0.2 -> 1+floor(0.2*5)=1+1=2
    // animal rng[1]=0
    // distractor draws: 0 -> 1, 0 -> 1 (dup), 0.6 -> 1+floor(3)=4
    const rng = stubRng([0.2, 0, 0, 0, 0.6]);
    const round = generateRound('easy', rng);
    expect(round.count).toBe(2);
    expect(round.choices).toContain(2);
    expect(round.choices).toHaveLength(3);
  });

  it('selects the right animal by index', () => {
    // animal index = floor(rng * 4). rng[1] = 0.8 -> floor(3.2) = 3 -> bunny
    const rng = stubRng([0.99, 0.8, 0.1, 0.4, 0.7]);
    const round = generateRound('medium', rng);
    expect(round.animal.key).toBe('bunny');
    expect(round.animal).toBe(CHARACTERS[3]);
  });

  it('produces tierChoices unique sorted choices for medium', () => {
    const rng = stubRng([0.05, 0.0, 0.3, 0.55, 0.85, 0.95]);
    const round = generateRound('medium', rng);
    expect(round.choices).toHaveLength(tierChoices('medium'));
    const sorted = [...round.choices].sort((a, b) => a - b);
    expect(round.choices).toEqual(sorted);
    expect(new Set(round.choices).size).toBe(round.choices.length);
  });

  it('defaults to Math.random when no rng is supplied', () => {
    const round = generateRound('hard');
    expect(round.count).toBeGreaterThanOrEqual(1);
    expect(round.count).toBeLessThanOrEqual(20);
    expect(round.choices).toContain(round.count);
  });

  const tiers: Tier[] = ['easy', 'medium', 'hard'];
  for (const tier of tiers) {
    it(`upholds all invariants under fuzzing for ${tier}`, () => {
      const max = tierMax(tier);
      const nChoices = tierChoices(tier);
      for (let i = 0; i < 500; i += 1) {
        const round = generateRound(tier, Math.random);
        // count in 1..max
        expect(round.count).toBeGreaterThanOrEqual(1);
        expect(round.count).toBeLessThanOrEqual(max);
        // choices length
        expect(round.choices).toHaveLength(nChoices);
        // includes the correct count
        expect(round.choices).toContain(round.count);
        // unique
        expect(new Set(round.choices).size).toBe(round.choices.length);
        // sorted ascending
        const sorted = [...round.choices].sort((a, b) => a - b);
        expect(round.choices).toEqual(sorted);
        // all within 1..max
        for (const c of round.choices) {
          expect(c).toBeGreaterThanOrEqual(1);
          expect(c).toBeLessThanOrEqual(max);
        }
        // animal is one of CHARACTERS
        expect(CHARACTERS).toContain(round.animal);
      }
    });
  }
});

describe('praiseLine', () => {
  it('matches the prototype shape with a child name', () => {
    expect(praiseLine(3, 'Hooray!', 'Jayden')).toBe('Three! Hooray!, Jayden');
  });
  it('omits the name (and comma) when no name is given', () => {
    expect(praiseLine(3, 'Hooray!')).toBe('Three! Hooray!');
    expect(praiseLine(3, 'Hooray!', '')).toBe('Three! Hooray!');
  });
  it('capitalizes the number word', () => {
    expect(praiseLine(0, 'Yes!')).toBe('Zero! Yes!');
    expect(praiseLine(1, 'Nice counting!')).toBe('One! Nice counting!');
    expect(praiseLine(20, 'Well done!')).toBe('Twenty! Well done!');
  });
  it('falls back to String(count) when count is out of word range', () => {
    expect(praiseLine(21, 'Yes!')).toBe('21! Yes!');
    expect(praiseLine(42, 'So clever!', 'Jayden')).toBe(
      '42! So clever!, Jayden',
    );
  });
});

describe('promptLine', () => {
  it('builds the prompt for each animal plural', () => {
    expect(promptLine(CHARACTERS[0])).toBe('How many ducks?');
    expect(promptLine(CHARACTERS[1])).toBe('How many cats?');
    expect(promptLine(CHARACTERS[2])).toBe('How many frogs?');
    expect(promptLine(CHARACTERS[3])).toBe('How many bunnies?');
  });
});
