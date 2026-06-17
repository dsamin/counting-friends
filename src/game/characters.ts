import type { AnimalKey, Character } from './types';

/**
 * The four friends, in the prototype's ANIMALS order.
 * Index 0 (Dot the duck) is the default mascot.
 */
export const CHARACTERS: Character[] = [
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
];

export function getCharacter(key: AnimalKey): Character {
  const found = CHARACTERS.find((c) => c.key === key);
  if (!found) {
    throw new Error(`Unknown animal key: ${key}`);
  }
  return found;
}
