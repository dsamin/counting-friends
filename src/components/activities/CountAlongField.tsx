import { useEffect, useState } from 'react';
import type { GameState } from '../../game/gameState';
import type { GameActions } from '../../game/useGame';
import { animalSize, promptLine } from '../../game/round';
import CharacterSprite from '../CharacterSprite';
import NumberButton from '../NumberButton';

/**
 * Count-Along (§5.1) — Count It remediation. After a wrong count answer the
 * friends become tappable: the child taps each one and the app counts aloud
 * ("one… two… three…"), building one-to-one correspondence. Once every friend is
 * counted, the number tiles appear so the child can answer. No-fail throughout;
 * this is a scaffold, never a forced default (it only appears via the engine
 * after a miss).
 */
interface CountAlongFieldProps {
  state: GameState;
  reduceMotion: boolean;
  actions: GameActions;
  registerButton: (value: number, el: HTMLButtonElement | null) => void;
}

export default function CountAlongField({
  state,
  reduceMotion,
  actions,
  registerButton,
}: CountAlongFieldProps) {
  const total = state.count;
  const [counted, setCounted] = useState(0);
  useEffect(() => {
    setCounted(0);
  }, [state.roundId]);

  const done = counted >= total;
  const size = animalSize(total);
  const isEasy = state.choices.length <= 3;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
      <div key={state.roundId} className="sr-only" role="status" aria-live="polite">
        {done ? promptLine(state.animal) : "Let's count them together!"}
      </div>

      <div style={{ height: 96, flex: 'none' }} />

      {/* Friends — tap each one to count along. */}
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
        {Array.from({ length: total }).map((_, i) => {
          const isCounted = i < counted;
          const isNext = i === counted && !done;
          return (
            <button
              key={`${state.roundId}-${i}`}
              type="button"
              data-count-friend
              data-counted={isCounted || undefined}
              aria-label={`friend ${i + 1}`}
              disabled={done}
              onClick={() => {
                if (done) return;
                const n = counted + 1;
                setCounted(n);
                actions.countSpeak(n);
              }}
              className="cf-animal"
              style={{
                width: size,
                height: size,
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: done ? 'default' : 'pointer',
                borderRadius: 14,
                outline: isNext ? '4px solid var(--cf-coral)' : 'none',
                opacity: isCounted || done ? 1 : 0.5,
                transition: reduceMotion ? 'none' : 'opacity 160ms ease',
              }}
            >
              <CharacterSprite href={state.animal.href} size={size} />
            </button>
          );
        })}
      </div>

      {/* Number tiles appear once every friend has been counted. */}
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
        {done &&
          state.choices.map((value) => (
            <NumberButton
              key={`${value}-${state.animKey}`}
              value={value}
              state={state}
              onChoose={actions.choose}
              isEasy={isEasy}
              reduceMotion={reduceMotion}
              innerRef={(el) => registerButton(value, el)}
            />
          ))}
      </div>
    </div>
  );
}
