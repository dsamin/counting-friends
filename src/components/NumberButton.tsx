import type { GameState } from '../game/gameState';

/**
 * NumberButton — one big Baloo 2 numeral on a chunky cream button.
 *
 * Visual state is derived from the shared game state: when this button's value
 * is the one mid-animation, it adds the correct (`squashPop` + duck-yellow) or
 * wrong (`wrongWobble`) classes. Remounting on `state.animKey` restarts the CSS
 * animation on every tap so a repeated wrong tap wobbles again.
 */
interface NumberButtonProps {
  value: number;
  state: GameState;
  onChoose: (value: number) => void;
  /** Easy tier uses the larger 152px button. */
  isEasy: boolean;
  /** Forwarded to the button element so confetti can read its center. */
  innerRef?: (el: HTMLButtonElement | null) => void;
}

export default function NumberButton({
  value,
  state,
  onChoose,
  isEasy,
  innerRef,
}: NumberButtonProps) {
  const active = state.animatingValue === value;
  const correct = active && state.animType === 'correct';
  const wrong = active && state.animType === 'wrong';

  const className = [
    'cf-number',
    isEasy && 'cf-number--easy',
    correct && 'cf-number--correct',
    wrong && 'cf-number--wrong',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      // Remount on each tap so the CSS animation replays.
      key={`${value}-${state.animKey}`}
      ref={innerRef}
      type="button"
      className={className}
      onClick={() => onChoose(value)}
      aria-label={`number ${value}`}
    >
      {value}
    </button>
  );
}
