import { useEffect, useMemo, useState } from 'react';
import type { AnswerPayload } from '../../game/activities/types';
import type { GameState } from '../../game/gameState';

/**
 * Put It in Order (§5.6). Two sub-modes:
 *  - `next`: a consecutive run is shown ("5 6 7 ?"); tap the next numeral.
 *  - `build`: shuffled numerals; tap them into ascending order. Each correct tap
 *    locks into the next slot; a wrong tap wobbles (no-fail). The engine completes
 *    the round when the full ascending sequence is assembled.
 */
interface OrderActivityProps {
  state: GameState;
  reduceMotion: boolean;
  onAnswer: (payload: AnswerPayload) => boolean;
}

const tileStyle = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: 92,
  height: 92,
  borderRadius: 'var(--cf-r-button)',
  border: '5px solid var(--cf-ink)',
  background: 'var(--cf-cream-raised)',
  color: 'var(--cf-ink)',
  fontFamily: 'var(--cf-font-display)',
  fontWeight: 800,
  fontSize: 46,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 6px 0 rgba(90,70,51,.16)',
  ...extra,
});

export default function OrderActivity({
  state,
  reduceMotion,
  onAnswer,
}: OrderActivityProps) {
  const round = state.round?.kind === 'order' ? state.round : null;
  const roundId = state.roundId;

  // build-mode local progress
  const [placed, setPlaced] = useState<number[]>([]);
  const [wobble, setWobble] = useState<number | null>(null);
  useEffect(() => {
    setPlaced([]);
    setWobble(null);
  }, [roundId]);

  // next-mode choices (the round carries no choices field — derive them here).
  const nextChoices = useMemo(() => {
    if (!round || round.mode !== 'next') return [];
    const target = round.answer[0];
    const base = [target, target - 1, target + 1, target + 2].filter((n) => n >= 1);
    const uniq = [...new Set(base)].slice(0, 3);
    if (!uniq.includes(target)) uniq[0] = target;
    const rot = roundId % uniq.length;
    return [...uniq.slice(rot), ...uniq.slice(0, rot)];
  }, [round, roundId]);

  if (!round) return null;

  const aria = round.mode === 'next' ? 'What comes next?' : 'Put the numbers in order!';

  if (round.mode === 'next') {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
        <div key={roundId} className="sr-only" role="status" aria-live="polite">
          {aria}
        </div>
        <div style={{ height: 96, flex: 'none' }} />
        {/* The run + a "?" slot. */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {round.numbers.map((n) => (
            <div key={n} data-order-run data-value={n} style={tileStyle({ opacity: 0.95 })}>
              {n}
            </div>
          ))}
          <div style={tileStyle({ background: 'transparent', borderStyle: 'dashed', color: 'var(--cf-ink-soft)' })}>
            ?
          </div>
        </div>
        {/* Choices. */}
        <div
          style={{
            flex: 'none',
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            padding: '0 40px 34px',
            minHeight: 160,
            alignItems: 'flex-end',
          }}
        >
          {nextChoices.map((v) => (
            <button
              key={v}
              type="button"
              aria-label={`number ${v}`}
              onClick={() => onAnswer({ kind: 'tile', value: v })}
              style={tileStyle({ cursor: 'pointer' })}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // build mode
  const remaining = round.numbers.filter((n) => !placed.includes(n));
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
      <div key={roundId} className="sr-only" role="status" aria-live="polite">
        {aria}
      </div>
      <div style={{ height: 96, flex: 'none' }} />
      {/* Slots filling in ascending order. */}
      <div
        style={{
          flex: 'none',
          display: 'flex',
          justifyContent: 'center',
          gap: 14,
          padding: '8px 40px 24px',
        }}
      >
        {round.answer.map((_, i) => (
          <div
            key={i}
            data-order-slot={i}
            style={tileStyle({
              background: placed[i] != null ? 'var(--cf-frog)' : 'transparent',
              borderStyle: placed[i] != null ? 'solid' : 'dashed',
              color: placed[i] != null ? 'var(--cf-ink)' : 'var(--cf-ink-faint)',
            })}
          >
            {placed[i] ?? ''}
          </div>
        ))}
      </div>
      {/* Pool of remaining numerals to tap. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '0 40px 34px',
        }}
      >
        {remaining.map((v) => (
          <button
            key={v}
            type="button"
            data-order-tile
            data-value={v}
            aria-label={`number ${v}`}
            className={wobble === v && !reduceMotion ? 'cf-wrongWobble' : undefined}
            onClick={() => {
              if (placed.includes(v)) return;
              const candidate = [...placed, v];
              const correct = onAnswer({ kind: 'sequence', values: candidate });
              if (correct) setPlaced(candidate);
              else {
                setWobble(v);
                window.setTimeout(() => setWobble(null), 520);
              }
            }}
            style={tileStyle({ cursor: 'pointer' })}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
