import type { AnswerPayload } from '../../game/activities/types';
import type { GameState } from '../../game/gameState';
import { WORDS } from '../../game/constants';
import CharacterSprite from '../CharacterSprite';
import NumberButton from '../NumberButton';

/**
 * Find the Number (§5.2) — "Find the seven!" → tap the matching numeral. A friend
 * cue at the top, a row of big number tiles below. The target numeral is among
 * the choices; the prompt is spoken + announced (the board is wordless).
 */
interface NumeralActivityProps {
  state: GameState;
  reduceMotion: boolean;
  onAnswer: (payload: AnswerPayload) => boolean;
  registerButton: (value: number, el: HTMLButtonElement | null) => void;
}

export default function NumeralActivity({
  state,
  reduceMotion,
  onAnswer,
  registerButton,
}: NumeralActivityProps) {
  const round = state.round?.kind === 'numeral' ? state.round : null;
  const choices = round ? round.choices : state.choices;
  const isEasy = choices.length <= 3;
  const anchored = round?.lookAlike ?? false;
  const aria = round ? `Find the ${WORDS[round.target] ?? round.target}!` : '';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div key={state.roundId} className="sr-only" role="status" aria-live="polite">
        {aria}
      </div>

      <div style={{ height: 96, flex: 'none' }} />

      {/* A friend looking for the number. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            animation: reduceMotion ? 'none' : 'cf-bob 2600ms ease-in-out infinite',
          }}
        >
          <CharacterSprite href="#owl" size={150} />
        </span>
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
            anchored={anchored}
          />
        ))}
      </div>
    </div>
  );
}
