import { useLayoutEffect, useRef, useState } from 'react';
import type { AnswerPayload, MatchItem } from '../../game/activities/types';
import type { GameState } from '../../game/gameState';
import { CHARACTERS } from '../../game/characters';
import CharacterSprite from '../CharacterSprite';
import RibbonLink from '../RibbonLink';

/**
 * Match Up (§5.3) — the left↔right matching game. Tap a group on the left, then
 * tap its number on the right; a correct connect draws a ribbon (and locks the
 * pair). A wrong connect is a SILENT non-event: a gentle wobble + de-select, no
 * sound, no penalty (the engine never resets the streak on a mis-connect). The
 * round completes — via the shared celebration — once every pair is linked.
 */
interface MatchActivityProps {
  state: GameState;
  reduceMotion: boolean;
  onAnswer: (payload: AnswerPayload) => boolean;
}

interface Line {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function MatchActivity({
  state,
  reduceMotion,
  onAnswer,
}: MatchActivityProps) {
  const round = state.round?.kind === 'match' ? state.round : null;
  const linked = state.matchProgress?.linked ?? [];
  const linkedLeft = new Set(linked.map((l) => l.leftId));
  const linkedRight = new Set(linked.map((l) => l.rightId));

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [wobbleRightId, setWobbleRightId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [lines, setLines] = useState<Line[]>([]);

  // Reset transient selection on a new round.
  useLayoutEffect(() => {
    setSelectedLeftId(null);
    setWobbleRightId(null);
  }, [state.roundId]);

  // Measure linked-pair endpoints (relative to the container) for the ribbons.
  useLayoutEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    const next: Line[] = [];
    for (const l of linked) {
      const le = itemRefs.current.get(l.leftId);
      const re = itemRefs.current.get(l.rightId);
      if (!le || !re) continue;
      const lr = le.getBoundingClientRect();
      const rr = re.getBoundingClientRect();
      next.push({
        id: `${l.leftId}-${l.rightId}`,
        x1: lr.right - cr.left,
        y1: lr.top + lr.height / 2 - cr.top,
        x2: rr.left - cr.left,
        y2: rr.top + rr.height / 2 - cr.top,
      });
    }
    setLines(next);
    // `linked` is read but intentionally NOT a dep — it's a fresh array each
    // render; we re-measure on a count/round change to avoid a setState loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked.length, state.roundId]);

  if (!round) return null;

  const setRef = (id: string) => (el: HTMLElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  };

  const tapRight = (item: MatchItem) => {
    if (linkedRight.has(item.id) || !selectedLeftId) return;
    const correct = onAnswer({
      kind: 'pair',
      leftId: selectedLeftId,
      rightId: item.id,
    });
    setSelectedLeftId(null);
    if (!correct) {
      setWobbleRightId(item.id);
      window.setTimeout(() => setWobbleRightId(null), 520);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 2 }}
    >
      <div key={state.roundId} className="sr-only" role="status" aria-live="polite">
        Match each group to its number!
      </div>

      {/* Ribbons. */}
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
      >
        {lines.map((l) => (
          <RibbonLink key={l.id} pairId={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </svg>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 40,
          padding: '104px 56px 40px',
          height: '100%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Left: groups of friends. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            alignItems: 'flex-start',
          }}
        >
          {round.left.map((item, i) => {
            const isLinked = linkedLeft.has(item.id);
            const isSelected = selectedLeftId === item.id;
            const friend = CHARACTERS[i % 4];
            return (
              <button
                key={item.id}
                ref={setRef(item.id)}
                type="button"
                data-match-left
                data-value={item.value}
                data-id={item.id}
                data-selected={isSelected || undefined}
                aria-label={`group of ${item.value}`}
                disabled={isLinked}
                onClick={() => !isLinked && setSelectedLeftId(item.id)}
                style={{
                  minHeight: 92,
                  minWidth: 92,
                  padding: '12px 18px',
                  background: 'var(--cf-cream-raised)',
                  border: `${isSelected ? 5 : 4}px solid ${isSelected ? 'var(--cf-coral)' : 'var(--cf-ink)'}`,
                  borderRadius: 'var(--cf-r-card)',
                  boxShadow: '0 6px 0 rgba(90,70,51,.14)',
                  opacity: isLinked ? 0.55 : 1,
                  cursor: isLinked ? 'default' : 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                    maxWidth: 200,
                    justifyContent: 'center',
                  }}
                >
                  {Array.from({ length: item.value }).map((_, j) => (
                    <CharacterSprite key={j} href={friend.href} size={38} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: numerals. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            alignItems: 'flex-end',
          }}
        >
          {round.right.map((item) => {
            const isLinked = linkedRight.has(item.id);
            const wobble = wobbleRightId === item.id && !reduceMotion;
            return (
              <button
                key={item.id}
                ref={setRef(item.id)}
                type="button"
                data-match-right
                data-value={item.value}
                data-id={item.id}
                aria-label={`number ${item.value}`}
                disabled={isLinked}
                onClick={() => tapRight(item)}
                className={wobble ? 'cf-wrongWobble' : undefined}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 'var(--cf-r-button)',
                  border: '5px solid var(--cf-ink)',
                  background: isLinked ? 'var(--cf-frog)' : 'var(--cf-cream-raised)',
                  color: 'var(--cf-ink)',
                  fontFamily: 'var(--cf-font-display)',
                  fontWeight: 800,
                  fontSize: 50,
                  boxShadow: '0 6px 0 rgba(90,70,51,.16)',
                  opacity: isLinked ? 0.85 : 1,
                  cursor: isLinked ? 'default' : 'pointer',
                }}
              >
                {item.value}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
