import { useEffect, useRef } from 'react';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import { animalSize, promptLine } from '../game/round';
import { TIMING } from '../game/constants';
import CharacterSprite from '../components/CharacterSprite';
import NumberButton from '../components/NumberButton';
import BackButton from '../components/BackButton';
import ReplayPill from '../components/ReplayPill';
import ParentalGate from '../components/ParentalGate';
import SettingsSheet from '../components/SettingsSheet';
import Confetti, { type ConfettiHandle } from '../components/Confetti';

/**
 * PlayScreen — the counting loop. Top chrome (back + replay), the adaptive
 * animal field, the number-choice row, the parental gate, the confetti overlay,
 * and the settings sheet. Confetti bursts from the tapped button's center when
 * the round flips to 'correct'.
 */
interface PlayScreenProps {
  state: GameState;
  actions: GameActions;
}

export default function PlayScreen({ state, actions }: PlayScreenProps) {
  const confettiRef = useRef<ConfettiHandle>(null);
  // Wrapper for the confetti canvas, used to translate button coords into
  // canvas-relative coords for the burst origin.
  const fieldRef = useRef<HTMLDivElement>(null);
  // Live map of number-button elements keyed by value, for the burst origin.
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  // The parental gate button — settings restore focus here on close.
  const gateButtonRef = useRef<HTMLButtonElement>(null);

  const size = animalSize(state.count);
  const isEasy = state.tier === 'easy';

  // Fire confetti when a correct answer flips the round to 'correct'.
  useEffect(() => {
    if (state.status !== 'correct') return;
    const canvasHost = fieldRef.current;
    if (!canvasHost) return;
    const hostRect = canvasHost.getBoundingClientRect();

    let cx = hostRect.width / 2;
    let cy = hostRect.height * 0.7;
    const el =
      state.animatingValue != null
        ? buttonRefs.current.get(state.animatingValue)
        : undefined;
    if (el) {
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2 - hostRect.left;
      cy = r.top + r.height / 2 - hostRect.top;
    }
    confettiRef.current?.burst(cx, cy, state.reduceMotion);
    // animKey changes on every choice, so repeated correct rounds re-fire.
  }, [state.status, state.animKey, state.animatingValue, state.reduceMotion]);

  return (
    <div
      ref={fieldRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Live region: announces the current question as text to assistive tech
          (VoiceOver) and deaf/HoH users, without adding visible child-facing
          copy. Keyed on roundId so each new round re-announces. */}
      <div className="sr-only" role="status" aria-live="polite">
        {state.count > 0 ? promptLine(state.animal) : ''}
      </div>

      {/* Reserve the top chrome band. */}
      <div style={{ height: 96, flex: 'none' }} />

      {/* Animal field. */}
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
        {Array.from({ length: state.count }).map((_, i) => {
          const delay = i * TIMING.popStagger;
          const animation = state.reduceMotion
            ? 'none'
            : `cf-popIn ${TIMING.popInDuration}ms cubic-bezier(.34,1.56,.64,1) ${delay}ms both, ` +
              `cf-bob ${2400 + (i % 3) * 350}ms ease-in-out ${delay + TIMING.popInDuration}ms infinite`;
          return (
            <div
              key={`${state.roundId}-${i}`}
              className="cf-animal"
              onClick={actions.tapAnimal}
              style={{
                width: size,
                height: size,
                cursor: 'pointer',
                animation,
                willChange: 'transform',
              }}
            >
              <CharacterSprite href={state.animal.href} size={size} />
            </div>
          );
        })}
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
        {state.choices.map((value) => (
          <NumberButton
            // Remount on each tap so the CSS animation replays.
            key={`${value}-${state.animKey}`}
            value={value}
            state={state}
            onChoose={actions.choose}
            isEasy={isEasy}
            innerRef={(el) => {
              if (el) buttonRefs.current.set(value, el);
              else buttonRefs.current.delete(value);
            }}
          />
        ))}
      </div>

      {/* Top chrome. */}
      <BackButton onBack={actions.back} />
      <ReplayPill speaking={state.speaking} onReplay={actions.replay} />

      {/* Confetti overlay (decorative, above content, no pointer events). */}
      <Confetti ref={confettiRef} />

      {/* Parental gate. */}
      <ParentalGate
        gateProgress={state.gateProgress}
        gateDown={actions.gateDown}
        gateUp={actions.gateUp}
        buttonRef={gateButtonRef}
      />

      {/* Settings overlay. */}
      <SettingsSheet
        state={state}
        actions={actions}
        restoreFocusRef={gateButtonRef}
      />
    </div>
  );
}
