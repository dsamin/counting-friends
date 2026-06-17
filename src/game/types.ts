export type Tier = 'easy' | 'medium' | 'hard';
export type Status = 'asking' | 'correct';
export type AnimalKey = 'duck' | 'cat' | 'frog' | 'bunny';

export interface Character {
  key: AnimalKey;
  name: string;
  plural: string;
  sound: string;
  href: string;
}

export interface Round {
  count: number;
  animal: Character;
  choices: number[];
}

/** Returns a value in [0, 1), like Math.random. */
export type Rng = () => number;
