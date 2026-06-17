/**
 * Game constants copied verbatim from the working prototype
 * (Counting Friends.dc.html). Do not let these drift.
 */

export const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
] as const;

export const PRAISE = [
  'You got it!',
  'Yes!',
  'Nice counting!',
  'Hooray!',
  'Well done!',
  'So clever!',
] as const;

/** Animation / interaction timings, in milliseconds. */
export const TIMING = {
  idle: 6000,
  advance: 1950,
  advanceReduceMotion: 1400,
  wrongRevert: 640,
  reask: 760,
  gateHold: 3000,
  popStagger: 55,
  popInDuration: 520,
  confettiFull: 1450,
  confettiReduceMotion: 900,
} as const;

export const CONFETTI = {
  full: 74,
  calm: 34,
  sparkles: 5,
  gravity: 0.17,
  drag: 0.99,
  colors: ['#FFC94D', '#FF8A7A', '#9FD9A3', '#A8D8E8', '#FFFFFF', '#FFB23E'],
} as const;

export const SPEECH = {
  rate: 0.92,
  pitch: 1.18,
} as const;
