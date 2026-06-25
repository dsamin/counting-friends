import { useEffect, useRef } from 'react';
import type { GameState } from '../game/gameState';
import type { GameActions } from '../game/useGame';
import { animalSize, promptLine } from '../game/round';
import { prefersReducedMotion } from '../game/reduceMotion';
import { TIMING } from '../game/constants';
import CharacterSprite from '../components/CharacterSprite';
import NumberButton from '../components/NumberButton';
import BackButton from '../components/BackButton';
import ReplayPill from '../components/ReplayPill';
import ParentalGate from '../components/ParentalGate';
import SettingsSheet from '../components/SettingsSheet';
import Confetti, { type ConfettiHandle } from '../components/Confetti';
import StarJar from '../components/StarJar';
import LevelUpBanner from '../components/LevelUpBanner';
import UnlockReveal from '../components/UnlockReveal';
import { celebrate, tap } from '../native/feedback';

/**
 * PlayScreen — the counting loop. Top chrome (back + replay), the adaptive
 * animal field, the number-choice row, the parental gate, the confetti overlay,
 * and the settings sheet. Confetti bursts from the tapped button's center when
 * the round flips to 'correct'.
 */
interface PlayScreenProps {
  state: GameState;
  actions: GameActions;
  /** Particle count for the celebration burst when motion is allowed. */
  confettiDensity?: 'full' | 'calm';
}

export default function PlayScreen({
  state,
  actions,
  confettiDensity = 'full',
}: PlayScreenProps) {
  const confettiRef = useRef<ConfettiHandle>(null);
  // Wrapper for the confetti canvas, used to translate button coords into
  // canvas-relative coords for the burst origin.
  const fieldRef = useRef<HTMLDivElement>(null);
  // Live map of number-button elements keyed by value, for the burst origin.
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  // The parental gate button — settings restore focus here on close.
  const gateButtonRef = useRef<HTMLButtonElement>(null);

  const size = animalSize(state.count);
  // The larger "easy" button styling tracks the low-difficulty 3-choice rounds.
  const isEasy = state.choices.length <= 3;

  // Effective reduce-motion: the in-app toggle OR the OS preference. Single
  // source of truth so confetti, the animal entrance/idle motion, and the
  // button squash/wobble all stay consistent with the CSS media-query safety
  // net (which also fires on the OS preference alone).
  const reduceMotion = state.reduceMotion || prefersReducedMotion();

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
    confettiRef.current?.burst(cx, cy, reduceMotion, confettiDensity);
    // Native success haptic, in lockstep with the confetti. Suppressed under
    // reduce-motion to honour the calm/low-stimulation posture. No-op on web.
    if (!reduceMotion) celebrate();
    // animKey changes on every choice, so repeated correct rounds re-fire.
  }, [
    state.status,
    state.animKey,
    state.animatingValue,
    reduceMotion,
    confettiDensity,
  ]);

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
          copy. Keyed on roundId so it remounts each round and re-announces even
          when consecutive rounds use the same animal (screen readers otherwise
          dedupe identical consecutive text). */}
      <div
        key={state.roundId}
        className="sr-only"
        role="status"
        aria-live="polite"
      >
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
          const animation = reduceMotion
            ? 'none'
            : `cf-popIn ${TIMING.popInDuration}ms cubic-bezier(.34,1.56,.64,1) ${delay}ms both, ` +
              `cf-bob ${2400 + (i % 3) * 350}ms ease-in-out ${delay + TIMING.popInDuration}ms infinite`;
          return (
            <div
              key={`${state.roundId}-${i}`}
              className="cf-animal"
              onClick={() => {
                if (!reduceMotion) tap(); // light native tick; no-op on web
                actions.tapAnimal();
              }}
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
            reduceMotion={reduceMotion}
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

      {/* Star count (top-right). */}
      <div
        style={{
          position: 'absolute',
          top: 'max(18px, env(safe-area-inset-top))',
          right: 'max(18px, env(safe-area-inset-right))',
          zIndex: 6,
        }}
      >
        <StarJar stars={state.stars} />
      </div>

      {/* Confetti overlay (decorative, above content, no pointer events). */}
      <Confetti ref={confettiRef} />

      {/* Celebration overlay — at most one (the arbiter guarantees it, §7.6). */}
      {state.overlay?.kind === 'celebrate' && (
        <LevelUpBanner
          line={state.overlay.line}
          reduceMotion={reduceMotion}
          onDismiss={actions.closeOverlay}
        />
      )}
      {state.overlay?.kind === 'unlock' && (
        <UnlockReveal
          characterKey={state.overlay.characterKey}
          reduceMotion={reduceMotion}
          onDismiss={actions.closeOverlay}
        />
      )}

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
