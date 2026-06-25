import type { AnswerPayload } from '../../game/activities/types';
import type { GameState } from '../../game/gameState';
import { WORDS } from '../../game/constants';
import { CHARACTERS } from '../../game/characters';
import CharacterSprite from '../CharacterSprite';
import NumberButton from '../NumberButton';

/**
 * Add & Take Away (§5.8) — two visible groups joined ("+") or separated ("−"),
 * then number tiles for the total / remainder. Tap the result numeral.
 */
interface AddActivityProps {
  state: GameState;
  reduceMotion: boolean;
  onAnswer: (payload: AnswerPayload) => boolean;
  registerButton: (value: number, el: HTMLButtonElement | null) => void;
}

function Group({ value, friend }: { value: number; friend: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        maxWidth: 220,
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: value }).map((_, i) => (
        <CharacterSprite key={i} href={friend} size={52} />
      ))}
    </div>
  );
}

export default function AddActivity({
  state,
  reduceMotion,
  onAnswer,
  registerButton,
}: AddActivityProps) {
  const round = state.round?.kind === 'add' ? state.round : null;
  if (!round) return null;
  const choices = round.choices;
  const isEasy = choices.length <= 3;
  const aria =
    round.op === '+'
      ? `${WORDS[round.a]} and ${WORDS[round.b]} more. How many altogether?`
      : `${WORDS[round.a]} take away ${WORDS[round.b]}. How many are left?`;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
      <div key={state.roundId} className="sr-only" role="status" aria-live="polite">
        {aria}
      </div>
      <div style={{ height: 96, flex: 'none' }} />

      {/* The two groups + operator. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: '0 40px',
        }}
      >
        <Group value={round.a} friend={CHARACTERS[0].href} />
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--cf-font-display)',
            fontWeight: 800,
            fontSize: 56,
            color: 'var(--cf-ink)',
          }}
        >
          {round.op === '+' ? '+' : '−'}
        </span>
        <Group value={round.b} friend={CHARACTERS[round.op === '+' ? 0 : 1].href} />
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
