import type { AnswerPayload } from '../../game/activities/types';
import type { GameState } from '../../game/gameState';
import { CHARACTERS } from '../../game/characters';
import { animalSize } from '../../game/round';
import CharacterSprite from '../CharacterSprite';

/**
 * More or Fewer (§5.5) — two groups of friends side by side; tap the one with
 * more (or fewer). The group is identified by its size, so the answer payload
 * carries that value. No-fail: a wrong tap routes through the shared loop.
 */
interface CompareActivityProps {
  state: GameState;
  reduceMotion: boolean;
  onAnswer: (payload: AnswerPayload) => boolean;
}

function Group({
  value,
  friend,
  onTap,
}: {
  value: number;
  friend: string;
  onTap: () => void;
}) {
  const size = Math.min(animalSize(value), 72);
  return (
    <button
      type="button"
      data-compare-group
      data-value={value}
      aria-label={`group of ${value}`}
      onClick={onTap}
      style={{
        // Intentionally static — a tappable target must not move under little fingers.
        minWidth: 200,
        minHeight: 220,
        padding: 20,
        background: 'var(--cf-cream-raised)',
        border: '4px solid var(--cf-ink)',
        borderRadius: 'var(--cf-r-card)',
        boxShadow: '0 8px 0 rgba(90,70,51,.14)',
        cursor: 'pointer',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: value }).map((_, i) => (
        <CharacterSprite key={i} href={friend} size={size} />
      ))}
    </button>
  );
}

export default function CompareActivity({
  state,
  onAnswer,
}: CompareActivityProps) {
  const round = state.round?.kind === 'compare' ? state.round : null;
  if (!round) return null;
  const aria = `Tap the group with ${round.ask}!`;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
      <div key={state.roundId} className="sr-only" role="status" aria-live="polite">
        {aria}
      </div>
      <div style={{ height: 96, flex: 'none' }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 56,
          padding: '0 48px 40px',
        }}
      >
        <Group
          value={round.left}
          friend={CHARACTERS[0].href}
          onTap={() => onAnswer({ kind: 'tile', value: round.left })}
        />
        <Group
          value={round.right}
          friend={CHARACTERS[1].href}
          onTap={() => onAnswer({ kind: 'tile', value: round.right })}
        />
      </div>
    </div>
  );
}
