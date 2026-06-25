import { describe, it, expect } from 'vitest';
import { animalSize, confettiCount, praiseLine, promptLine } from './round';
import { CHARACTERS } from './characters';
import { CONFETTI } from './constants';

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

describe('confettiCount', () => {
  it('reduce-motion collapses to the sparkle count regardless of density', () => {
    expect(confettiCount(true, 'full')).toBe(CONFETTI.sparkles);
    expect(confettiCount(true, 'calm')).toBe(CONFETTI.sparkles);
    expect(confettiCount(true, 'full')).toBe(5);
  });
  it('full density bursts the full particle count', () => {
    expect(confettiCount(false, 'full')).toBe(CONFETTI.full);
    expect(confettiCount(false, 'full')).toBe(74);
  });
  it('calm density bursts the calm particle count', () => {
    expect(confettiCount(false, 'calm')).toBe(CONFETTI.calm);
    expect(confettiCount(false, 'calm')).toBe(34);
  });
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
