import { describe, it, expect } from 'vitest';
import { CHARACTERS, getCharacter } from './characters';

describe('CHARACTERS', () => {
  it('lists the four friends in prototype order', () => {
    expect(CHARACTERS.map((c) => c.key)).toEqual([
      'duck',
      'cat',
      'frog',
      'bunny',
    ]);
  });

  it('has the duck (Dot) as the index-0 mascot', () => {
    expect(CHARACTERS[0]).toMatchObject({
      key: 'duck',
      name: 'Dot',
      plural: 'ducks',
      sound: 'Quack',
      href: '#duck',
    });
  });

  it('matches the brand sheet for every friend', () => {
    expect(CHARACTERS).toEqual([
      { key: 'duck', name: 'Dot', plural: 'ducks', sound: 'Quack', href: '#duck' },
      { key: 'cat', name: 'Pip', plural: 'cats', sound: 'Meow', href: '#cat' },
      {
        key: 'frog',
        name: 'Hopper',
        plural: 'frogs',
        sound: 'Ribbit',
        href: '#frog',
      },
      {
        key: 'bunny',
        name: 'Momo',
        plural: 'bunnies',
        sound: 'Boing',
        href: '#bunny',
      },
    ]);
  });
});

describe('getCharacter', () => {
  it('looks up each friend by key', () => {
    expect(getCharacter('duck').name).toBe('Dot');
    expect(getCharacter('cat').name).toBe('Pip');
    expect(getCharacter('frog').name).toBe('Hopper');
    expect(getCharacter('bunny').name).toBe('Momo');
  });

  it('returns the same object reference held in CHARACTERS', () => {
    expect(getCharacter('frog')).toBe(CHARACTERS[2]);
  });
});
