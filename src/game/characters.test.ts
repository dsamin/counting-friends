import { describe, it, expect } from 'vitest';
import { CHARACTERS, getCharacter } from './characters';

describe('CHARACTERS', () => {
  it('lists the four friends, three new friends, then the shape pack in order', () => {
    expect(CHARACTERS.map((c) => c.key)).toEqual([
      'duck',
      'cat',
      'frog',
      'bunny',
      'dog',
      'owl',
      'pig',
      'star',
      'heart',
      'circle',
    ]);
  });

  it('has a roster of ten', () => {
    expect(CHARACTERS).toHaveLength(10);
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

  it('matches the brand sheet for every entry', () => {
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
      { key: 'dog', name: 'Rex', plural: 'dogs', sound: 'Woof', href: '#dog' },
      { key: 'owl', name: 'Hoot', plural: 'owls', sound: 'Hoot', href: '#owl' },
      { key: 'pig', name: 'Pippin', plural: 'pigs', sound: 'Oink', href: '#pig' },
      {
        key: 'star',
        name: 'Twinkle',
        plural: 'stars',
        sound: 'Twinkle',
        href: '#star',
      },
      {
        key: 'heart',
        name: 'Lovely',
        plural: 'hearts',
        sound: 'Thump',
        href: '#heart',
      },
      {
        key: 'circle',
        name: 'Roundy',
        plural: 'circles',
        sound: 'Boop',
        href: '#circle',
      },
    ]);
  });

  it('points every entry at its matching `#key` symbol href', () => {
    for (const c of CHARACTERS) {
      expect(c.href).toBe(`#${c.key}`);
    }
  });
});

describe('getCharacter', () => {
  it('looks up each original friend by key', () => {
    expect(getCharacter('duck').name).toBe('Dot');
    expect(getCharacter('cat').name).toBe('Pip');
    expect(getCharacter('frog').name).toBe('Hopper');
    expect(getCharacter('bunny').name).toBe('Momo');
  });

  it('looks up the new friends and shapes by key', () => {
    expect(getCharacter('dog').name).toBe('Rex');
    expect(getCharacter('owl').sound).toBe('Hoot');
    expect(getCharacter('pig').plural).toBe('pigs');
    expect(getCharacter('star').name).toBe('Twinkle');
    expect(getCharacter('heart').sound).toBe('Thump');
    expect(getCharacter('circle').href).toBe('#circle');
  });

  it('returns the same object reference held in CHARACTERS', () => {
    expect(getCharacter('frog')).toBe(CHARACTERS[2]);
  });
});
