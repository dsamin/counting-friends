import type { GameState } from '../game/gameState';

/**
 * NumberButton — one big Baloo 2 numeral on a chunky cream button.
 *
 * Visual state is derived from the shared game state: when this button's value
 * is the one mid-animation, it adds the correct (duck-yellow) or wrong color
 * class. The squash/wobble *keyframe* classes (`cf-squashPop`/`cf-wrongWobble`)
 * are applied separately and only when motion is allowed, so a reduce-motion
 * user still gets the color feedback without the bouncy motion — keeping JS and
 * the CSS `@media (prefers-reduced-motion)` safety net consistent. Remounting
 * on `state.animKey` restarts the CSS animation on every tap so a repeated wrong
 * tap wobbles again.
 */
interface NumberButtonProps {
  value: number;
  state: GameState;
  onChoose: (value: number) => void;
  /** Easy tier uses the larger 152px button. */
  isEasy: boolean;
  /** When true, suppress the squash/wobble keyframes (color still applies). */
  reduceMotion?: boolean;
  /** Forwarded to the button element so confetti can read its center. */
  innerRef?: (el: HTMLButtonElement | null) => void;
  /** Draw a ground-line under the numeral so look-alikes (6/9) read upright (§5.2). */
  anchored?: boolean;
}

export default function NumberButton({
  value,
  state,
  onChoose,
  isEasy,
  reduceMotion = false,
  innerRef,
  anchored = false,
}: NumberButtonProps) {
  const active = state.animatingValue === value;
  const correct = active && state.animType === 'correct';
  const wrong = active && state.animType === 'wrong';

  const className = [
    'cf-number',
    isEasy && 'cf-number--easy',
    correct && 'cf-number--correct',
    wrong && 'cf-number--wrong',
    // Motion keyframes are decoupled from color so reduce-motion keeps the
    // win legible (color) without the bounce.
    correct && !reduceMotion && 'cf-squashPop',
    wrong && !reduceMotion && 'cf-wrongWobble',
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
      {anchored ? (
        <span
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: 1,
          }}
        >
          {value}
          {/* Ground line: disambiguates 6 from 9 by showing which way is up. */}
          <span
            data-anchor
            style={{
              width: '48%',
              height: 4,
              borderRadius: 2,
              background: 'var(--cf-ink)',
              marginTop: 4,
            }}
          />
        </span>
      ) : (
        value
      )}
    </button>
  );
}
