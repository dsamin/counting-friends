import type { AnswerPayload } from '../../game/activities/types';
import type { GameState } from '../../game/gameState';
import { animalSize } from '../../game/round';
import CharacterSprite from '../CharacterSprite';
import NumberButton from '../NumberButton';

/**
 * Quick Look / subitize (§5.4) — friends flash for a moment (revealed phase, the
 * engine hides them after revealMs), then "How many did you see?" with number
 * tiles. No punishing timer; a wrong answer just re-asks via the shared loop.
 */
interface QuickLookActivityProps {
  state: GameState;
  reduceMotion: boolean;
  onAnswer: (payload: AnswerPayload) => boolean;
  registerButton: (value: number, el: HTMLButtonElement | null) => void;
}

export default function QuickLookActivity({
  state,
  reduceMotion,
  onAnswer,
  registerButton,
}: QuickLookActivityProps) {
  const round = state.round?.kind === 'quicklook' ? state.round : null;
  const count = round ? round.count : state.count;
  const choices = round ? round.choices : state.choices;
  const isEasy = choices.length <= 3;
  const revealed = state.revealPhase === 'revealed';
  const size = animalSize(count);

  return (
    <div
      data-phase={state.revealPhase}
      data-count={count}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div key={state.roundId} className="sr-only" role="status" aria-live="polite">
        Quick! How many did you see?
      </div>

      <div style={{ height: 96, flex: 'none' }} />

      {/* Reveal field (friends) OR the choices, depending on phase. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          justifyContent: 'center',
          gap: '8px 18px',
          padding: '0 60px',
        }}
      >
        {revealed
          ? Array.from({ length: count }).map((_, i) => (
              <div
                key={`${state.roundId}-${i}`}
                className="cf-animal"
                style={{ width: size, height: size }}
              >
                <CharacterSprite href={state.animal.href} size={size} />
              </div>
            ))
          : null}
      </div>

      {/* Number choices — only once the friends are hidden. */}
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
        {!revealed &&
          choices.map((value) => (
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
