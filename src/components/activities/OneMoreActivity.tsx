import type { AnswerPayload } from '../../game/activities/types';
import type { GameState } from '../../game/gameState';
import { WORDS } from '../../game/constants';
import { CHARACTERS } from '../../game/characters';
import CharacterSprite from '../CharacterSprite';
import NumberButton from '../NumberButton';

/**
 * One More / One Less (§5.7) — a group of `base` friends, a "+1 / −1" cue, then
 * number tiles. Tap the numeral that is one more / one less.
 */
interface OneMoreActivityProps {
  state: GameState;
  reduceMotion: boolean;
  onAnswer: (payload: AnswerPayload) => boolean;
  registerButton: (value: number, el: HTMLButtonElement | null) => void;
}

export default function OneMoreActivity({
  state,
  reduceMotion,
  onAnswer,
  registerButton,
}: OneMoreActivityProps) {
  const round = state.round?.kind === 'onemore' ? state.round : null;
  if (!round) return null;
  const choices = round.choices;
  const isEasy = choices.length <= 3;
  const which = round.delta === 1 ? 'one more' : 'one less';
  const aria = `Here are ${WORDS[round.base] ?? round.base}. What is ${which}?`;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
      <div key={state.roundId} className="sr-only" role="status" aria-live="polite">
        {aria}
      </div>
      <div style={{ height: 96, flex: 'none' }} />

      {/* The base group + a one-more / one-less cue. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            maxWidth: 520,
            justifyContent: 'center',
          }}
        >
          {Array.from({ length: round.base }).map((_, i) => (
            <CharacterSprite key={i} href={CHARACTERS[0].href} size={56} />
          ))}
        </div>
        <div
          aria-hidden="true"
          style={{
            fontFamily: 'var(--cf-font-display)',
            fontWeight: 800,
            fontSize: 40,
            color: round.delta === 1 ? 'var(--cf-frog)' : 'var(--cf-coral)',
          }}
        >
          {round.delta === 1 ? '+1' : '−1'}
        </div>
      </div>

      {/* Number choices. */}
      <div
        style={{
          flex: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: 28,
          padding: '0 40px 34px',
          minHeight: 188,
        }}
      >
        {choices.map((value) => (
          <NumberButton
            key={`${value}-${state.animKey}`}
            value={value}
            state={state}
            onChoose={(v) => onAnswer({ kind: 'tile', value: v })}
            isEasy={isEasy}
            reduceMotion={reduceMotion}
            innerRef={(el) => registerButton(value, el)}
          />
        ))}
      </div>
    </div>
  );
}
